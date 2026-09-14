import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, newId } from "@monevo/db";
import type { Database } from "@monevo/db";
import { sql } from "drizzle-orm";

import { buildServices } from "../src/app.ts";

const url = process.env["DATABASE_URL"];

describe.skipIf(!url)("account against a real database", () => {
	let db: Database;
	let services: ReturnType<typeof buildServices>;
	let owner: string;
	let other: string;
	let ledgerId: string;

	async function makeUser(): Promise<string> {
		const id = newId();
		await db.execute(sql`
			INSERT INTO app_user (id, cognito_sub, email, email_normalized, display_name,
				display_currency, status)
			VALUES (${id}::uuid, ${newId()}::uuid, ${id + "@e.com"}, ${id + "@e.com"},
				${"U" + id.slice(0, 6)}, 'JPY', 'ACTIVE')`);

		return id;
	}

	async function makeLedger(userId: string): Promise<string> {
		const id = newId();
		await db.execute(sql`
			INSERT INTO ledger (id, name, currency, owner_user_id, timezone)
			VALUES (${id}::uuid, 'Home', 'JPY', ${userId}::uuid, 'Asia/Tokyo')`);
		await db.execute(sql`
			INSERT INTO ledger_member (id, ledger_id, user_id, role)
			VALUES (${newId()}::uuid, ${id}::uuid, ${userId}::uuid, 'OWNER')`);

		return id;
	}

	const cash = (over: Record<string, unknown> = {}) => ({
		name: "Cash",
		type: "CASH" as const,
		currency: "JPY",
		ledgerIds: [],
		openingBalanceMinor: 0,
		memo: null,
		...over,
	});

	beforeAll(async () => {
		db = createDatabase({ url: url!, max: 5 });
		services = buildServices(db);
	});

	afterAll(async () => {
		await db.$client.end();
	});

	beforeEach(async () => {
		owner = await makeUser();
		other = await makeUser();
		ledgerId = await makeLedger(owner);
	});

	describe("accounts", () => {
		it("creates a cash account as an asset", async () => {
			const account = await services.accounts.create(cash(), owner);

			expect(account).toMatchObject({ nature: "ASSET", subtype: "REAL", archived: false });
			expect(account.balanceMinor).toBe(0);
		});

		it("makes a credit card a liability", async () => {
			const account = await services.accounts.create(cash({ type: "CREDIT_CARD" }), owner);

			expect(account.nature).toBe("LIABILITY");
		});

		it("rejects a currency that is not seeded", async () => {
			await expect(services.accounts.create(cash({ currency: "EUR" }), owner)).rejects.toMatchObject(
				{ code: "CURRENCY_NOT_SUPPORTED" },
			);
		});

		it("links into a ledger it was created with", async () => {
			const account = await services.accounts.create(cash({ ledgerIds: [ledgerId] }), owner);

			expect(account.ledgerIds).toEqual([ledgerId]);
			expect((await services.accounts.list(ledgerId, false, owner)).map((a) => a.id)).toEqual([
				account.id,
			]);
		});

		it("refuses to share into a ledger the owner is not in", async () => {
			const foreign = await makeLedger(other);

			await expect(
				services.accounts.create(cash({ ledgerIds: [foreign] }), owner),
			).rejects.toMatchObject({ code: "ACCOUNT_SHARE_TARGET_INVALID" });
		});

		it("records a positive opening balance", async () => {
			const account = await services.accounts.create(cash({ openingBalanceMinor: 50000 }), owner);

			expect((await services.accounts.balance(account.id, owner)).balanceMinor).toBe(50000);
		});

		it("records a negative opening balance", async () => {
			const account = await services.accounts.create(
				cash({ type: "CREDIT_CARD", openingBalanceMinor: -30000 }),
				owner,
			);

			expect((await services.accounts.balance(account.id, owner)).balanceMinor).toBe(-30000);
		});

		it("writes a balanced opening entry", async () => {
			const account = await services.accounts.create(cash({ openingBalanceMinor: 50000 }), owner);

			const rows = await db.execute<{ diff: string }>(sql`
				SELECT SUM(CASE WHEN l.side = 'DEBIT' THEN l.base_amount_minor
					ELSE -l.base_amount_minor END)::bigint AS diff
				FROM journal_line l
				JOIN journal_entry e ON e.id = l.entry_id
				WHERE e.create_request_hash = ${"opening:" + account.id} AND l.deleted_at IS NULL`);

			expect(Number(rows[0]!.diff)).toBe(0);
		});

		it("gives sequential sort orders", async () => {
			await services.accounts.create(cash({ name: "A" }), owner);
			await services.accounts.create(cash({ name: "B" }), owner);

			const rows = await db.execute<{ sort_order: number }>(sql`
				SELECT sort_order FROM account WHERE owner_user_id = ${owner}::uuid AND subtype = 'REAL'
				ORDER BY sort_order`);

			expect(rows.map((r) => r.sort_order)).toEqual([0, 10]);
		});

		it("bumps the version and rejects a stale update", async () => {
			const account = await services.accounts.create(cash(), owner);

			const renamed = await services.accounts.update(
				account.id,
				{ name: "Wallet", memo: null, archived: null, version: 0 },
				owner,
			);
			expect(renamed).toMatchObject({ name: "Wallet", version: 1 });

			await expect(
				services.accounts.update(
					account.id,
					{ name: "Again", memo: null, archived: null, version: 0 },
					owner,
				),
			).rejects.toMatchObject({ code: "CONCURRENT_MODIFICATION" });
		});

		it("lets exactly one of two simultaneous updates win", async () => {
			const account = await services.accounts.create(cash(), owner);

			const results = await Promise.allSettled([
				services.accounts.update(
					account.id,
					{ name: "First", memo: null, archived: null, version: 0 },
					owner,
				),
				services.accounts.update(
					account.id,
					{ name: "Second", memo: null, archived: null, version: 0 },
					owner,
				),
			]);

			expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
			expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
			expect((await services.accounts.get(account.id, owner)).version).toBe(1);
		});

		it("rolls the account back when a later link fails", async () => {
			await expect(
				services.accounts.create(cash({ ledgerIds: [ledgerId, ledgerId] }), owner),
			).rejects.toThrow();

			expect(await services.accounts.list(undefined, true, owner)).toEqual([]);

			const links = await db.execute<{ n: string }>(sql`
				SELECT COUNT(*)::bigint AS n FROM ledger_account WHERE ledger_id = ${ledgerId}::uuid`);
			expect(Number(links[0]!.n)).toBe(0);
		});

		it("archives and unarchives", async () => {
			const account = await services.accounts.create(cash(), owner);

			const archived = await services.accounts.update(
				account.id,
				{ name: null, memo: null, archived: true, version: 0 },
				owner,
			);
			expect(archived.archived).toBe(true);
			expect(await services.accounts.list(undefined, false, owner)).toEqual([]);
			expect(await services.accounts.list(undefined, true, owner)).toHaveLength(1);

			const restored = await services.accounts.update(
				account.id,
				{ name: null, memo: null, archived: false, version: 1 },
				owner,
			);
			expect(restored.archived).toBe(false);
		});

		it("refuses to link an archived account", async () => {
			const account = await services.accounts.create(cash(), owner);
			await services.accounts.update(
				account.id,
				{ name: null, memo: null, archived: true, version: 0 },
				owner,
			);

			await expect(services.accounts.link(account.id, ledgerId, owner)).rejects.toMatchObject({
				code: "ACCOUNT_ARCHIVED",
			});
		});

		it("links idempotently", async () => {
			const account = await services.accounts.create(cash(), owner);

			await services.accounts.link(account.id, ledgerId, owner);
			await services.accounts.link(account.id, ledgerId, owner);

			expect((await services.accounts.get(account.id, owner)).ledgerIds).toEqual([ledgerId]);
		});

		it("unlinks", async () => {
			const account = await services.accounts.create(cash({ ledgerIds: [ledgerId] }), owner);

			await services.accounts.unlink(account.id, ledgerId, owner);

			expect((await services.accounts.get(account.id, owner)).ledgerIds).toEqual([]);
		});

		it("lets a co-member see a shared account but not edit it", async () => {
			await db.execute(sql`
				INSERT INTO ledger_member (id, ledger_id, user_id, role)
				VALUES (${newId()}::uuid, ${ledgerId}::uuid, ${other}::uuid, 'MEMBER')`);
			const account = await services.accounts.create(cash({ ledgerIds: [ledgerId] }), owner);

			await expect(services.accounts.get(account.id, other)).resolves.toMatchObject({
				id: account.id,
			});
			await expect(
				services.accounts.update(
					account.id,
					{ name: "No", memo: null, archived: null, version: 0 },
					other,
				),
			).rejects.toMatchObject({ code: "ACCOUNT_NOT_ACCESSIBLE" });
		});

		it("hides an unshared account from everyone else", async () => {
			const account = await services.accounts.create(cash(), owner);

			await expect(services.accounts.get(account.id, other)).rejects.toMatchObject({
				code: "ACCOUNT_NOT_ACCESSIBLE",
			});
		});

		it("deletes an account that only has an opening balance", async () => {
			const account = await services.accounts.create(cash({ openingBalanceMinor: 1000 }), owner);

			await services.accounts.remove(account.id, owner);

			await expect(services.accounts.get(account.id, owner)).rejects.toMatchObject({
				code: "ACCOUNT_NOT_FOUND",
			});
		});
	});

	describe("categories", () => {
		async function makeRoot(name = "Food", kind: "EXPENSE" | "INCOME" = "EXPENSE") {
			return services.categories.create(ledgerId, { name, kind, parentId: null }, owner);
		}

		it("creates a root and a child", async () => {
			const root = await makeRoot();
			const child = await services.categories.create(
				ledgerId,
				{ name: "Grocery", kind: "EXPENSE", parentId: root.id },
				owner,
			);

			expect(child.kind).toBe("EXPENSE");

			const tree = await services.categories.tree(ledgerId, undefined, owner);
			expect(tree.find((node) => node.id === root.id)!.children.map((c) => c.id)).toEqual([child.id]);
		});

		it("refuses a third level", async () => {
			const root = await makeRoot();
			const child = await services.categories.create(
				ledgerId,
				{ name: "Grocery", kind: "EXPENSE", parentId: root.id },
				owner,
			);

			await expect(
				services.categories.create(
					ledgerId,
					{ name: "Deeper", kind: "EXPENSE", parentId: child.id },
					owner,
				),
			).rejects.toMatchObject({ code: "CATEGORY_DEPTH_EXCEEDED" });
		});

		it("refuses a child whose kind differs from its parent", async () => {
			const root = await makeRoot("Salary", "INCOME");

			await expect(
				services.categories.create(
					ledgerId,
					{ name: "Nope", kind: "EXPENSE", parentId: root.id },
					owner,
				),
			).rejects.toMatchObject({ code: "CATEGORY_KIND_MISMATCH" });
		});

		it("refuses a parent from another ledger", async () => {
			const root = await makeRoot();
			const otherLedger = await makeLedger(owner);

			await expect(
				services.categories.create(
					otherLedger,
					{ name: "Nope", kind: "EXPENSE", parentId: root.id },
					owner,
				),
			).rejects.toMatchObject({ code: "CATEGORY_LEDGER_MISMATCH" });
		});

		it("filters the tree by kind", async () => {
			await makeRoot("Food", "EXPENSE");
			await makeRoot("Salary", "INCOME");

			const income = await services.categories.tree(ledgerId, "INCOME", owner);

			expect(income.map((node) => node.name)).toEqual(["Salary"]);
		});

		it("renames and reorders", async () => {
			const root = await makeRoot();

			const updated = await services.categories.update(
				root.id,
				{ name: "Meals", sortOrder: 50 },
				owner,
			);

			expect(updated).toMatchObject({ name: "Meals", sortOrder: 50 });
		});

		it("refuses to delete a category with children", async () => {
			const root = await makeRoot();
			await services.categories.create(
				ledgerId,
				{ name: "Grocery", kind: "EXPENSE", parentId: root.id },
				owner,
			);

			await expect(services.categories.remove(root.id, owner)).rejects.toMatchObject({
				code: "CATEGORY_HAS_CHILDREN",
			});
		});

		it("deletes a leaf", async () => {
			const root = await makeRoot();

			await services.categories.remove(root.id, owner);

			expect((await services.categories.tree(ledgerId, undefined, owner)).map((n) => n.id)).not.toContain(
				root.id,
			);
		});

		it("refuses a non-member", async () => {
			await expect(
				services.categories.tree(ledgerId, undefined, other),
			).rejects.toMatchObject({ code: "LEDGER_NOT_MEMBER" });
		});
	});
});
