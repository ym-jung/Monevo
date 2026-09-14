import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, newId } from "@monevo/db";
import type { Database } from "@monevo/db";
import { sql } from "drizzle-orm";

import { buildServices } from "../src/app.ts";

const url = process.env["DATABASE_URL"];

describe.skipIf(!url)("journal against a real database", () => {
	let db: Database;
	let services: ReturnType<typeof buildServices>;
	let owner: string;
	let stranger: string;
	let ledgerId: string;
	let cash: string;
	let card: string;
	let food: string;
	let grocery: string;
	let salary: string;

	async function makeUser(): Promise<string> {
		const id = newId();
		await db.execute(sql`
			INSERT INTO app_user (id, cognito_sub, email, email_normalized, display_name,
				display_currency, status)
			VALUES (${id}::uuid, ${newId()}::uuid, ${id + "@e.com"}, ${id + "@e.com"},
				${"U" + id.slice(0, 6)}, 'JPY', 'ACTIVE')`);

		return id;
	}

	async function makeReal(name: string, currency: string, type = "CASH"): Promise<string> {
		const id = newId();
		await db.execute(sql`
			INSERT INTO account (id, owner_user_id, name, type, nature, subtype, currency, sort_order)
			VALUES (${id}::uuid, ${owner}::uuid, ${name}, ${type},
				${type === "CREDIT_CARD" ? "LIABILITY" : "ASSET"}, 'REAL', ${currency}, 0)`);
		await db.execute(sql`
			INSERT INTO ledger_account (id, ledger_id, account_id)
			VALUES (${newId()}::uuid, ${ledgerId}::uuid, ${id}::uuid)`);

		return id;
	}

	async function makeCategory(name: string, nature: string, parent: string | null): Promise<string> {
		const id = newId();
		await db.execute(sql`
			INSERT INTO account (id, ledger_id, parent_id, name, nature, subtype, sort_order)
			VALUES (${id}::uuid, ${ledgerId}::uuid,
				${parent ? sql`${parent}::uuid` : sql`NULL`}, ${name}, ${nature}, 'CATEGORY', 0)`);

		return id;
	}

	const entry = (over: Record<string, unknown> = {}) => ({
		clientRequestId: null,
		ledgerId,
		entryDate: "2026-08-05",
		description: "lunch",
		memo: null,
		lines: [
			{ side: "DEBIT" as const, accountId: grocery, amountMinor: 1200, currency: null, fxRate: null, memo: null },
			{ side: "CREDIT" as const, accountId: cash, amountMinor: 1200, currency: null, fxRate: null, memo: null },
		],
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
		stranger = await makeUser();
		ledgerId = newId();
		await db.execute(sql`
			INSERT INTO ledger (id, name, currency, owner_user_id, timezone)
			VALUES (${ledgerId}::uuid, 'Home', 'JPY', ${owner}::uuid, 'Asia/Tokyo')`);
		await db.execute(sql`
			INSERT INTO ledger_member (id, ledger_id, user_id, role)
			VALUES (${newId()}::uuid, ${ledgerId}::uuid, ${owner}::uuid, 'OWNER')`);

		cash = await makeReal("Cash", "JPY");
		card = await makeReal("Card", "USD", "CREDIT_CARD");
		food = await makeCategory("Food", "EXPENSE", null);
		grocery = await makeCategory("Grocery", "EXPENSE", food);
		salary = await makeCategory("Salary", "INCOME", null);
	});

	it("creates a two-line expense and derives its kind", async () => {
		const created = await services.journal.create(entry(), owner);

		expect(created.kind).toBe("EXPENSE");
		expect(created.baseAmountMinor).toBe(1200);
		expect(created.lines).toHaveLength(2);
		expect(created.version).toBe(0);
	});

	it("derives INCOME and TRANSFER too", async () => {
		const income = await services.journal.create(
			entry({
				lines: [
					{ side: "DEBIT", accountId: cash, amountMinor: 300000, currency: null, fxRate: null, memo: null },
					{ side: "CREDIT", accountId: salary, amountMinor: 300000, currency: null, fxRate: null, memo: null },
				],
			}),
			owner,
		);
		expect(income.kind).toBe("INCOME");

		const other = await makeReal("Savings", "JPY");
		const transfer = await services.journal.create(
			entry({
				lines: [
					{ side: "DEBIT", accountId: other, amountMinor: 5000, currency: null, fxRate: null, memo: null },
					{ side: "CREDIT", accountId: cash, amountMinor: 5000, currency: null, fxRate: null, memo: null },
				],
			}),
			owner,
		);
		expect(transfer.kind).toBe("TRANSFER");
	});

	it("prices a foreign line with a supplied rate", async () => {
		const created = await services.journal.create(
			entry({
				lines: [
					{ side: "DEBIT", accountId: grocery, amountMinor: 1500, currency: "JPY", fxRate: null, memo: null },
					{ side: "CREDIT", accountId: card, amountMinor: 1000, currency: "USD", fxRate: "150", memo: null },
				],
			}),
			owner,
		);

		const credit = created.lines.find((line) => line.side === "CREDIT")!;
		expect(credit.currency).toBe("USD");
		expect(credit.baseAmountMinor).toBe(1500);
		expect(credit.fxRateSource).toBe("MANUAL");
	});

	it("refuses an unbalanced entry before the trigger sees it", async () => {
		await expect(
			services.journal.create(
				entry({
					lines: [
						{ side: "DEBIT", accountId: grocery, amountMinor: 1200, currency: null, fxRate: null, memo: null },
						{ side: "CREDIT", accountId: cash, amountMinor: 900, currency: null, fxRate: null, memo: null },
					],
				}),
				owner,
			),
		).rejects.toMatchObject({ code: "JOURNAL_ENTRY_UNBALANCED" });
	});

	it("refuses a parent category", async () => {
		await expect(
			services.journal.create(
				entry({
					lines: [
						{ side: "DEBIT", accountId: food, amountMinor: 100, currency: null, fxRate: null, memo: null },
						{ side: "CREDIT", accountId: cash, amountMinor: 100, currency: null, fxRate: null, memo: null },
					],
				}),
				owner,
			),
		).rejects.toMatchObject({ code: "CATEGORY_NOT_LEAF" });
	});

	it("refuses an archived account", async () => {
		await db.execute(sql`UPDATE account SET archived_at = now() WHERE id = ${cash}::uuid`);

		await expect(services.journal.create(entry(), owner)).rejects.toMatchObject({
			code: "ACCOUNT_ARCHIVED",
		});
	});

	it("refuses a non-member", async () => {
		await expect(services.journal.create(entry(), stranger)).rejects.toMatchObject({
			code: "LEDGER_NOT_MEMBER",
		});
	});

	it("replays an identical request instead of writing twice", async () => {
		const clientRequestId = newId();

		const first = await services.journal.create(entry({ clientRequestId }), owner);
		const second = await services.journal.create(entry({ clientRequestId }), owner);

		expect(second.id).toBe(first.id);

		const rows = await db.execute<{ n: string }>(sql`
			SELECT COUNT(*)::bigint AS n FROM journal_entry
			WHERE ledger_id = ${ledgerId}::uuid AND deleted_at IS NULL`);
		expect(Number(rows[0]!.n)).toBe(1);
	});

	it("refuses the same key with a different body", async () => {
		const clientRequestId = newId();
		await services.journal.create(entry({ clientRequestId }), owner);

		await expect(
			services.journal.create(entry({ clientRequestId, description: "dinner" }), owner),
		).rejects.toMatchObject({ code: "TRANSACTION_IDEMPOTENCY_KEY_REUSED" });
	});

	it("replaces the whole line set on update", async () => {
		const created = await services.journal.create(entry(), owner);

		const updated = await services.journal.update(
			created.id,
			{
				entryDate: null,
				description: "brunch",
				memo: null,
				lines: [
					{ side: "DEBIT", accountId: grocery, amountMinor: 900, currency: null, fxRate: null, memo: "half" },
					{ side: "CREDIT", accountId: cash, amountMinor: 900, currency: null, fxRate: null, memo: null },
				],
				version: 0,
			},
			owner,
		);

		expect(updated.description).toBe("brunch");
		expect(updated.baseAmountMinor).toBe(900);
		expect(updated.version).toBe(1);
		expect(updated.lines).toHaveLength(2);
	});

	it("rejects a stale version", async () => {
		const created = await services.journal.create(entry(), owner);
		await services.journal.update(
			created.id,
			{ entryDate: null, description: "once", memo: null, lines: null, version: 0 },
			owner,
		);

		await expect(
			services.journal.update(
				created.id,
				{ entryDate: null, description: "twice", memo: null, lines: null, version: 0 },
				owner,
			),
		).rejects.toMatchObject({ code: "CONCURRENT_MODIFICATION" });
	});

	it("removes the entry and its lines from the balance", async () => {
		const created = await services.journal.create(entry(), owner);

		await services.journal.remove(created.id, owner);

		await expect(services.journal.get(created.id, owner)).rejects.toMatchObject({
			code: "JOURNAL_ENTRY_NOT_FOUND",
		});

		const rows = await db.execute<{ n: string }>(sql`
			SELECT COUNT(*)::bigint AS n FROM journal_line
			WHERE entry_id = ${created.id}::uuid AND deleted_at IS NULL`);
		expect(Number(rows[0]!.n)).toBe(0);
	});

	it("lists entries newest first and filters by category", async () => {
		await services.journal.create(entry({ entryDate: "2026-08-01" }), owner);
		await services.journal.create(entry({ entryDate: "2026-08-20" }), owner);

		const all = await services.journal.search(
			{ ledgerId, accountIds: [], categoryIds: [], kinds: [], page: 0, size: 50 },
			owner,
		);
		expect(all.items.map((item) => item.entryDate)).toEqual(["2026-08-20", "2026-08-01"]);

		const byParent = await services.journal.search(
			{ ledgerId, accountIds: [], categoryIds: [food], kinds: [], page: 0, size: 50 },
			owner,
		);
		expect(byParent.totalElements).toBe(2);
	});

	it("filters by date range and kind", async () => {
		await services.journal.create(entry({ entryDate: "2026-07-15" }), owner);
		await services.journal.create(entry({ entryDate: "2026-08-20" }), owner);

		const august = await services.journal.search(
			{ ledgerId, from: "2026-08-01", to: "2026-08-31", accountIds: [], categoryIds: [], kinds: [], page: 0, size: 50 },
			owner,
		);
		expect(august.totalElements).toBe(1);

		const income = await services.journal.search(
			{ ledgerId, accountIds: [], categoryIds: [], kinds: ["INCOME"], page: 0, size: 50 },
			owner,
		);
		expect(income.totalElements).toBe(0);
	});

	it("names the primary and counter account on a two-line entry", async () => {
		await services.journal.create(entry(), owner);

		const listed = await services.journal.search(
			{ ledgerId, accountIds: [], categoryIds: [], kinds: [], page: 0, size: 50 },
			owner,
		);

		expect(listed.items[0]!.primaryAccount?.name).toBe("Cash");
		expect(listed.items[0]!.counterAccount?.name).toBe("Grocery");
		expect(listed.items[0]!.counterAccount?.parentName).toBe("Food");
	});

	it("keeps every written entry balanced in the database", async () => {
		await services.journal.create(entry(), owner);
		await services.journal.create(
			entry({
				lines: [
					{ side: "DEBIT", accountId: grocery, amountMinor: 1500, currency: "JPY", fxRate: null, memo: null },
					{ side: "CREDIT", accountId: card, amountMinor: 1000, currency: "USD", fxRate: "150", memo: null },
				],
			}),
			owner,
		);

		const rows = await db.execute<{ id: string }>(sql`
			SELECT e.id FROM journal_entry e
			JOIN journal_line l ON l.entry_id = e.id AND l.deleted_at IS NULL
			WHERE e.ledger_id = ${ledgerId}::uuid AND e.deleted_at IS NULL
			GROUP BY e.id
			HAVING SUM(CASE WHEN l.side = 'DEBIT' THEN l.base_amount_minor
				ELSE -l.base_amount_minor END) <> 0`);

		expect(rows).toEqual([]);
	});
});
