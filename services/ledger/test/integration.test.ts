import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, newId } from "@monevo/db";
import type { Database } from "@monevo/db";
import { sql } from "drizzle-orm";

import { buildServices } from "../src/app.ts";

const url = process.env["DATABASE_URL"];

describe.skipIf(!url)("ledger against a real database", () => {
	let db: Database;
	let services: ReturnType<typeof buildServices>;
	let owner: string;
	let guest: string;

	async function makeUser(): Promise<string> {
		const id = newId();
		const sub = newId();
		await db.execute(sql`
			INSERT INTO app_user (id, cognito_sub, email, email_normalized, display_name,
				display_currency, status)
			VALUES (${id}::uuid, ${sub}::uuid, ${id + "@example.com"}, ${id + "@example.com"},
				${"U" + id.slice(0, 6)}, 'JPY', 'ACTIVE')`);

		return id;
	}

	async function makeLedger(userId: string) {
		return services.ledgers.create(
			{ name: "Home", currency: "JPY", timezone: "Asia/Tokyo", confirmCurrencyIrreversible: true },
			userId,
			"en",
		);
	}

	beforeAll(async () => {
		db = createDatabase({ url: url!, max: 5 });
		services = buildServices(db);
	});

	afterAll(async () => {
		await db.$client.end();
	});

	beforeEach(async () => {
		owner = await makeUser();
		guest = await makeUser();
	});

	it("creates a ledger with the owner as its only member", async () => {
		const ledger = await makeLedger(owner);

		expect(ledger.myRole).toBe("OWNER");
		expect(ledger.memberCount).toBe(1);
		expect(ledger.currency).toBe("JPY");
		expect(ledger.version).toBe(0);
	});

	it("seeds the default category tree", async () => {
		const ledger = await makeLedger(owner);

		const rows = await db.execute<{ roots: string; total: string }>(sql`
			SELECT COUNT(*) FILTER (WHERE parent_id IS NULL)::bigint AS roots,
				COUNT(*)::bigint AS total
			FROM account WHERE ledger_id = ${ledger.id}::uuid AND subtype = 'CATEGORY'`);

		expect(Number(rows[0]!.roots)).toBe(13);
		expect(Number(rows[0]!.total)).toBe(51);
	});

	it("refuses to create a ledger without the currency confirmation", async () => {
		await expect(
			services.ledgers.create(
				{ name: "No", currency: "JPY", timezone: "UTC", confirmCurrencyIrreversible: false },
				owner,
				"en",
			),
		).rejects.toMatchObject({ code: "LEDGER_CURRENCY_CONFIRM_REQUIRED" });
	});

	it("lists only the ledgers the user belongs to", async () => {
		const mine = await makeLedger(owner);
		await makeLedger(guest);

		const listed = await services.ledgers.listMine(owner);

		expect(listed.map((ledger) => ledger.id)).toEqual([mine.id]);
	});

	it("bumps the version on rename and rejects a stale one", async () => {
		const ledger = await makeLedger(owner);

		const renamed = await services.ledgers.rename(ledger.id, { name: "Shared", version: 0 }, owner);
		expect(renamed.name).toBe("Shared");
		expect(renamed.version).toBe(1);

		await expect(
			services.ledgers.rename(ledger.id, { name: "Again", version: 0 }, owner),
		).rejects.toMatchObject({ code: "CONCURRENT_MODIFICATION" });
	});

	it("lets exactly one of two simultaneous renames win", async () => {
		const ledger = await makeLedger(owner);

		const results = await Promise.allSettled([
			services.ledgers.rename(ledger.id, { name: "First", version: 0 }, owner),
			services.ledgers.rename(ledger.id, { name: "Second", version: 0 }, owner),
		]);

		expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
		expect((await services.ledgers.get(ledger.id, owner)).version).toBe(1);
	});

	it("leaves nothing behind when creation is rejected", async () => {
		await expect(
			services.ledgers.create(
				{ name: "x".repeat(200), currency: "JPY", timezone: "UTC", confirmCurrencyIrreversible: true },
				owner,
				"en",
			),
		).rejects.toThrow();

		expect(await services.ledgers.listMine(owner)).toEqual([]);
	});

	it("lets only the owner rename", async () => {
		const ledger = await makeLedger(owner);

		await expect(
			services.ledgers.rename(ledger.id, { name: "Nope", version: 0 }, guest),
		).rejects.toMatchObject({ code: "LEDGER_NOT_MEMBER" });
	});

	it("accepts an invite and adds the guest as a member", async () => {
		const ledger = await makeLedger(owner);
		const invite = await services.invites.issue(ledger.id, owner, {});

		const accepted = await services.invites.accept(invite.code, guest);

		expect(accepted).toMatchObject({ ledgerId: ledger.id, role: "MEMBER" });
		expect((await services.members.list(ledger.id, owner)).map((m) => m.role).sort()).toEqual([
			"MEMBER",
			"OWNER",
		]);
	});

	it("accepts a lowercased and padded code", async () => {
		const ledger = await makeLedger(owner);
		const invite = await services.invites.issue(ledger.id, owner, {});

		await expect(
			services.invites.accept(`  ${invite.code.toLowerCase()}  `, guest),
		).resolves.toMatchObject({ ledgerId: ledger.id });
	});

	it("refuses a second use of a single-use invite", async () => {
		const ledger = await makeLedger(owner);
		const invite = await services.invites.issue(ledger.id, owner, { maxUses: 1 });
		const third = await makeUser();

		await services.invites.accept(invite.code, guest);

		await expect(services.invites.accept(invite.code, third)).rejects.toMatchObject({
			code: "INVITE_EXHAUSTED",
		});
	});

	it("hands the invite to exactly one of two simultaneous claims", async () => {
		const ledger = await makeLedger(owner);
		const invite = await services.invites.issue(ledger.id, owner, { maxUses: 1 });
		const second = await makeUser();

		const results = await Promise.allSettled([
			services.invites.accept(invite.code, guest),
			services.invites.accept(invite.code, second),
		]);

		expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
		expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);

		const members = await services.members.list(ledger.id, owner);
		expect(members).toHaveLength(2);
	});

	it("refuses an invite the caller already belongs to", async () => {
		const ledger = await makeLedger(owner);
		const invite = await services.invites.issue(ledger.id, owner, { maxUses: 5 });

		await expect(services.invites.accept(invite.code, owner)).rejects.toMatchObject({
			code: "INVITE_ALREADY_MEMBER",
		});
	});

	it("refuses a revoked invite", async () => {
		const ledger = await makeLedger(owner);
		const invite = await services.invites.issue(ledger.id, owner, {});

		await services.invites.revoke(ledger.id, invite.id, owner);

		await expect(services.invites.accept(invite.code, guest)).rejects.toMatchObject({
			code: "INVITE_REVOKED",
		});
	});

	it("hides a revoked invite from the usable list", async () => {
		const ledger = await makeLedger(owner);
		const invite = await services.invites.issue(ledger.id, owner, {});

		await services.invites.revoke(ledger.id, invite.id, owner);

		expect(await services.invites.listUsable(ledger.id, owner)).toEqual([]);
	});

	it("stops the owner from leaving", async () => {
		const ledger = await makeLedger(owner);

		await expect(services.members.leave(ledger.id, owner)).rejects.toMatchObject({
			code: "LEDGER_OWNER_CANNOT_LEAVE",
		});
	});

	it("stops the owner from being evicted", async () => {
		const ledger = await makeLedger(owner);
		const invite = await services.invites.issue(ledger.id, owner, {});
		await services.invites.accept(invite.code, guest);

		await expect(services.members.evict(ledger.id, owner, owner)).rejects.toMatchObject({
			code: "LEDGER_OWNER_CANNOT_LEAVE",
		});
	});

	it("lets a member leave", async () => {
		const ledger = await makeLedger(owner);
		const invite = await services.invites.issue(ledger.id, owner, {});
		await services.invites.accept(invite.code, guest);

		await services.members.leave(ledger.id, guest);

		expect(await services.members.list(ledger.id, owner)).toHaveLength(1);
	});

	it("soft deletes the ledger and everything hanging off it", async () => {
		const ledger = await makeLedger(owner);

		await services.ledgers.remove(ledger.id, owner);

		expect(await services.ledgers.listMine(owner)).toEqual([]);
		await expect(services.ledgers.get(ledger.id, owner)).rejects.toMatchObject({
			code: "LEDGER_NOT_FOUND",
		});

		const rows = await db.execute<{ alive: string }>(sql`
			SELECT COUNT(*)::bigint AS alive FROM ledger_member
			WHERE ledger_id = ${ledger.id}::uuid AND deleted_at IS NULL`);
		expect(Number(rows[0]!.alive)).toBe(0);
	});

	it("reports a ledger the caller cannot see as forbidden, not missing", async () => {
		const ledger = await makeLedger(owner);

		await expect(services.ledgers.get(ledger.id, guest)).rejects.toMatchObject({
			code: "LEDGER_NOT_MEMBER",
		});
	});
});
