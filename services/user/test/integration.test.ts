import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, newId } from "@monevo/db";
import type { Database } from "@monevo/db";
import { sql } from "drizzle-orm";

import { buildServices } from "../src/app.ts";

const url = process.env["DATABASE_URL"];

describe.skipIf(!url)("user and admin against a real database", () => {
	let db: Database;
	let services: ReturnType<typeof buildServices>;
	let evicted: string[];
	let admin: string;
	let pending: string;

	async function makeUser(status = "ACTIVE", role = "USER"): Promise<string> {
		const id = newId();
		await db.execute(sql`
			INSERT INTO app_user (id, cognito_sub, email, email_normalized, display_name,
				display_currency, role, status)
			VALUES (${id}::uuid, ${newId()}::uuid, ${id + "@e.com"}, ${id + "@e.com"},
				${"U" + id.slice(0, 6)}, 'JPY', ${role}, ${status})`);

		return id;
	}

	beforeAll(async () => {
		db = createDatabase({ url: url!, max: 5 });
	});

	afterAll(async () => {
		await db.$client.end();
	});

	beforeEach(async () => {
		evicted = [];
		services = buildServices(db, {
			findOrProvision: async () => undefined,
			evict: (sub) => evicted.push(sub),
		});
		admin = await makeUser("ACTIVE", "ADMIN");
		pending = await makeUser("PENDING");
	});

	describe("profile", () => {
		it("returns the caller's own row", async () => {
			const me = await services.profiles.me(admin);

			expect(me).toMatchObject({ id: admin, role: "ADMIN", status: "ACTIVE" });
		});

		it("updates only what was sent", async () => {
			const before = await services.profiles.me(admin);

			const after = await services.profiles.update(admin, {
				displayName: "Renamed",
				email: null,
				displayCurrency: null,
				locale: null,
				timezone: null,
			});

			expect(after.displayName).toBe("Renamed");
			expect(after.email).toBe(before.email);
			expect(after.timezone).toBe(before.timezone);
		});

		it("evicts the principal when the locale changes", async () => {
			await services.profiles.update(admin, {
				locale: "ko",
				email: null,
				displayName: null,
				displayCurrency: null,
				timezone: null,
			});

			expect(evicted).toHaveLength(1);
		});

		it("does not evict when only the timezone changes", async () => {
			await services.profiles.update(admin, {
				timezone: "Asia/Tokyo",
				email: null,
				displayName: null,
				displayCurrency: null,
				locale: null,
			});

			expect(evicted).toEqual([]);
		});

		it("does not evict when the locale is set to what it already was", async () => {
			await services.profiles.update(admin, {
				locale: "en",
				email: null,
				displayName: null,
				displayCurrency: null,
				timezone: null,
			});

			expect(evicted).toEqual([]);
		});
	});

	describe("admin", () => {
		it("approves a pending user and clears any stale reason", async () => {
			await services.admin.reject(admin, pending, "wrong address");
			await db.execute(sql`
				UPDATE app_user SET status = 'PENDING' WHERE id = ${pending}::uuid`);

			const approved = await services.admin.approve(admin, pending);

			expect(approved).toMatchObject({ status: "ACTIVE", approvedByUserId: admin });
			expect(approved.rejectReason).toBeNull();
		});

		it("stores the rejection reason", async () => {
			const rejected = await services.admin.reject(admin, pending, "not recognised");

			expect(rejected).toMatchObject({ status: "REJECTED", rejectReason: "not recognised" });
		});

		it("refuses to approve someone who is not pending", async () => {
			await services.admin.approve(admin, pending);

			await expect(services.admin.approve(admin, pending)).rejects.toMatchObject({
				code: "USER_ALREADY_PROCESSED",
			});
		});

		it("refuses to act on yourself", async () => {
			await expect(services.admin.approve(admin, admin)).rejects.toMatchObject({
				code: "CANNOT_MODIFY_SELF",
			});
			await expect(services.admin.remove(admin, admin)).rejects.toMatchObject({
				code: "CANNOT_MODIFY_SELF",
			});
		});

		it("suspends and reactivates", async () => {
			const active = await makeUser("ACTIVE");

			expect((await services.admin.changeStatus(admin, active, "SUSPENDED")).status).toBe(
				"SUSPENDED",
			);
			expect((await services.admin.changeStatus(admin, active, "ACTIVE")).status).toBe("ACTIVE");
		});

		it("evicts the principal on every status change", async () => {
			await services.admin.approve(admin, pending);

			expect(evicted).toHaveLength(1);
		});

		it("refuses to delete a user who still owns a ledger", async () => {
			const owner = await makeUser("ACTIVE");
			const ledgerId = newId();
			await db.execute(sql`
				INSERT INTO ledger (id, name, currency, owner_user_id, timezone)
				VALUES (${ledgerId}::uuid, 'L', 'JPY', ${owner}::uuid, 'UTC')`);
			await db.execute(sql`
				INSERT INTO ledger_member (id, ledger_id, user_id, role)
				VALUES (${newId()}::uuid, ${ledgerId}::uuid, ${owner}::uuid, 'OWNER')`);

			await expect(services.admin.remove(admin, owner)).rejects.toMatchObject({
				code: "LEDGER_OWNER_CANNOT_LEAVE",
			});
		});

		it("deletes a plain member and drops their memberships", async () => {
			const owner = await makeUser("ACTIVE");
			const member = await makeUser("ACTIVE");
			const ledgerId = newId();
			await db.execute(sql`
				INSERT INTO ledger (id, name, currency, owner_user_id, timezone)
				VALUES (${ledgerId}::uuid, 'L', 'JPY', ${owner}::uuid, 'UTC')`);
			await db.execute(sql`
				INSERT INTO ledger_member (id, ledger_id, user_id, role) VALUES
					(${newId()}::uuid, ${ledgerId}::uuid, ${owner}::uuid, 'OWNER'),
					(${newId()}::uuid, ${ledgerId}::uuid, ${member}::uuid, 'MEMBER')`);

			await services.admin.remove(admin, member);

			const rows = await db.execute<{ status: string; alive: string }>(sql`
				SELECT u.status,
					(SELECT COUNT(*)::bigint FROM ledger_member
						WHERE user_id = ${member}::uuid AND deleted_at IS NULL) AS alive
				FROM app_user u WHERE u.id = ${member}::uuid`);

			expect(rows[0]!.status).toBe("DELETED");
			expect(Number(rows[0]!.alive)).toBe(0);
		});

		it("pages and filters by status", async () => {
			const listed = await services.admin.list({ status: "PENDING", page: 0, size: 1 });

			expect(listed.items).toHaveLength(1);
			expect(listed.items[0]!.status).toBe("PENDING");
			expect(listed.size).toBe(1);
			expect(listed.totalElements).toBeGreaterThanOrEqual(1);
			expect(listed.hasNext).toBe(listed.totalPages > 1);
		});

		it("orders newest first", async () => {
			const first = await makeUser("PENDING");
			const second = await makeUser("PENDING");

			const listed = await services.admin.list({ status: "PENDING", page: 0, size: 100 });
			const ids = listed.items.map((item) => item.id);

			expect(ids.indexOf(second)).toBeLessThan(ids.indexOf(first));
		});
	});
});
