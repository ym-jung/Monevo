import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDatabase, newId, transaction } from "@monevo/db";
import type { Database } from "@monevo/db";
import { sql } from "drizzle-orm";

import { buildSummaryService } from "../src/app.ts";

const url = process.env["DATABASE_URL"];

const MISSING_LEDGER = "00000000-0000-7000-8000-0000000000dd";
const MISSING_CATEGORY = "00000000-0000-7000-8000-0000000000ee";
const STRANGER = "00000000-0000-7000-8000-0000000000ff";

describe.skipIf(!url)("report against a real database", () => {
	let db: Database;
	let summaries: ReturnType<typeof buildSummaryService>;

	let LEDGER: string;
	let USER: string;
	let CASH: string;
	let FOOD: string;
	let GROCERY: string;
	let SALARY: string;

	async function makeCategory(name: string, nature: string, parent: string | null): Promise<string> {
		const id = newId();
		await db.execute(sql`
			INSERT INTO account (id, ledger_id, parent_id, name, nature, subtype, sort_order)
			VALUES (${id}::uuid, ${LEDGER}::uuid,
				${parent ? sql`${parent}::uuid` : sql`NULL`}, ${name}, ${nature}, 'CATEGORY', 0)`);

		return id;
	}

	async function makeEntry(
		kind: string,
		entryDate: string,
		amountMinor: number,
		debit: string,
		credit: string,
	): Promise<void> {
		const id = newId();

		await transaction(db, async (tx) => {
			await tx.execute(sql`
				INSERT INTO journal_entry (id, ledger_id, kind, entry_date, description,
					created_by_user_id, client_request_id, create_request_hash)
				VALUES (${id}::uuid, ${LEDGER}::uuid, ${kind}, ${entryDate}::date, ${kind.toLowerCase()},
					${USER}::uuid, ${newId()}::uuid, ${newId().replace(/-/g, "")})`);

			for (const [lineNo, [side, accountId]] of [
				["DEBIT", debit],
				["CREDIT", credit],
			].entries()) {
				await tx.execute(sql`
					INSERT INTO journal_line (id, entry_id, line_no, side, account_id, currency,
						amount_minor, fx_rate, base_amount_minor, fx_rate_source)
					VALUES (${newId()}::uuid, ${id}::uuid, ${lineNo + 1}, ${side}, ${accountId}::uuid, 'JPY',
						${amountMinor}, 1, ${amountMinor}, 'SAME_CURRENCY')`);
			}
		});
	}

	beforeAll(async () => {
		db = createDatabase({ url: url!, max: 5 });
		summaries = buildSummaryService(db);

		USER = newId();
		await db.execute(sql`
			INSERT INTO app_user (id, cognito_sub, email, email_normalized, display_name,
				display_currency, status)
			VALUES (${USER}::uuid, ${newId()}::uuid, ${USER + "@e.com"}, ${USER + "@e.com"},
				${"U" + USER.slice(0, 6)}, 'JPY', 'ACTIVE')`);

		LEDGER = newId();
		await db.execute(sql`
			INSERT INTO ledger (id, name, currency, owner_user_id, timezone)
			VALUES (${LEDGER}::uuid, 'Home', 'JPY', ${USER}::uuid, 'Asia/Tokyo')`);
		await db.execute(sql`
			INSERT INTO ledger_member (id, ledger_id, user_id, role)
			VALUES (${newId()}::uuid, ${LEDGER}::uuid, ${USER}::uuid, 'OWNER')`);

		CASH = newId();
		await db.execute(sql`
			INSERT INTO account (id, owner_user_id, name, type, nature, subtype, currency, sort_order)
			VALUES (${CASH}::uuid, ${USER}::uuid, 'Cash', 'CASH', 'ASSET', 'REAL', 'JPY', 0)`);
		await db.execute(sql`
			INSERT INTO ledger_account (id, ledger_id, account_id)
			VALUES (${newId()}::uuid, ${LEDGER}::uuid, ${CASH}::uuid)`);

		FOOD = await makeCategory("Food", "EXPENSE", null);
		GROCERY = await makeCategory("Grocery", "EXPENSE", FOOD);
		SALARY = await makeCategory("Salary", "INCOME", null);

		await makeEntry("EXPENSE", "2026-08-05", 1200, GROCERY, CASH);
		await makeEntry("INCOME", "2026-08-25", 300000, CASH, SALARY);
	});

	afterAll(async () => {
		await db.$client.end();
	});

	it("totals income and expense for the month", async () => {
		const summary = await summaries.monthly({ ledgerId: LEDGER, month: "2026-08", requesterId: USER });

		expect(summary.incomeMinor).toBe(300000);
		expect(summary.expenseMinor).toBe(1200);
		expect(summary.netMinor).toBe(298800);
		expect(summary.currency).toBe("JPY");
	});

	it("rolls a child category up into its parent", async () => {
		const summary = await summaries.monthly({ ledgerId: LEDGER, month: "2026-08", requesterId: USER });

		expect(summary.byCategory).toHaveLength(1);
		expect(summary.byCategory[0]!.name).toBe("Food");
		expect(summary.byCategory[0]!.expenseMinor).toBe(1200);
		expect(summary.byCategory[0]!.children[0]!.name).toBe("Grocery");
	});

	it("attributes the expense to the account that funded it", async () => {
		const summary = await summaries.monthly({ ledgerId: LEDGER, month: "2026-08", requesterId: USER });

		expect(summary.byAccount).toEqual([{ accountId: CASH, name: "Cash", expenseMinor: 1200 }]);
	});

	it("returns zeros for a month with no entries", async () => {
		const summary = await summaries.monthly({ ledgerId: LEDGER, month: "2026-07", requesterId: USER });

		expect(summary.incomeMinor).toBe(0);
		expect(summary.expenseMinor).toBe(0);
		expect(summary.byCategory).toEqual([]);
	});

	it("keeps an entry that falls on the last day of the month", async () => {
		const summary = await summaries.monthly({ ledgerId: LEDGER, month: "2026-08", requesterId: USER });
		const august = await summaries.period({
			ledgerId: LEDGER,
			from: "2026-08-25",
			to: "2026-08-25",
			bucket: "DAY",
			requesterId: USER,
		});

		expect(august.incomeMinor).toBe(summary.incomeMinor);
	});

	it("narrows to the asked category and its children", async () => {
		const summary = await summaries.monthly({
			ledgerId: LEDGER,
			month: "2026-08",
			categoryIds: [FOOD],
			requesterId: USER,
		});

		expect(summary.expenseMinor).toBe(1200);
		expect(summary.incomeMinor).toBe(0);
	});

	it("narrows to the asked account", async () => {
		const summary = await summaries.monthly({
			ledgerId: LEDGER,
			month: "2026-08",
			accountIds: [CASH],
			requesterId: USER,
		});

		expect(summary.expenseMinor).toBe(1200);
	});

	it("fills the daily series across the whole range", async () => {
		const analysis = await summaries.period({
			ledgerId: LEDGER,
			from: "2026-08-04",
			to: "2026-08-06",
			bucket: "DAY",
			requesterId: USER,
		});

		expect(analysis.series.map((point) => [point.periodStart, point.expenseMinor])).toEqual([
			["2026-08-04", 0],
			["2026-08-05", 1200],
			["2026-08-06", 0],
		]);
	});

	it("buckets by month", async () => {
		const analysis = await summaries.period({
			ledgerId: LEDGER,
			from: "2026-08-01",
			to: "2026-08-31",
			bucket: "MONTH",
			requesterId: USER,
		});

		expect(analysis.series).toHaveLength(1);
		expect(analysis.series[0]).toMatchObject({ periodStart: "2026-08-01", expenseMinor: 1200 });
	});

	it("refuses a non-member", async () => {
		await expect(
			summaries.monthly({
				ledgerId: LEDGER,
				month: "2026-08",
				requesterId: STRANGER,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("refuses a category from another ledger", async () => {
		await expect(
			summaries.monthly({
				ledgerId: LEDGER,
				month: "2026-08",
				categoryIds: [MISSING_CATEGORY],
				requesterId: USER,
			}),
		).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
	});

	it("reports a missing ledger as not found", async () => {
		await expect(
			summaries.monthly({
				ledgerId: MISSING_LEDGER,
				month: "2026-08",
				requesterId: USER,
			}),
		).rejects.toMatchObject({ code: "LEDGER_NOT_FOUND" });
	});

	it("expands a parent category to include its child's spend", async () => {
		const viaParent = await summaries.monthly({
			ledgerId: LEDGER,
			month: "2026-08",
			categoryIds: [FOOD],
			requesterId: USER,
		});
		const viaChild = await summaries.monthly({
			ledgerId: LEDGER,
			month: "2026-08",
			categoryIds: [GROCERY],
			requesterId: USER,
		});

		expect(viaParent.expenseMinor).toBe(viaChild.expenseMinor);
	});
});
