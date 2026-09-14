import type { Executor } from "@monevo/db";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { toMinor } from "@monevo/money";

import type { AccountTotal, CategoryTotal, DailyTotal } from "../domain/summary.ts";
import { idList } from "./sql.ts";

export interface SummaryQuery {
	ledgerId: string;
	from: string;
	to: string;
	accountIds: readonly string[];
	categoryIds: readonly string[];
}

export interface SummaryTotals {
	incomeMinor: bigint;
	expenseMinor: bigint;
}

export interface SummaryRepository {
	totals(query: SummaryQuery): Promise<SummaryTotals>;
	expenseByCategory(query: SummaryQuery): Promise<CategoryTotal[]>;
	expenseByAccount(query: SummaryQuery): Promise<AccountTotal[]>;
	dailyTotals(query: SummaryQuery): Promise<DailyTotal[]>;
}

function scope(query: SummaryQuery): SQL {
	const clauses: SQL[] = [
		sql`FROM journal_line l
			JOIN journal_entry e ON e.id = l.entry_id AND e.deleted_at IS NULL
			JOIN account a ON a.id = l.account_id
			WHERE e.ledger_id = ${query.ledgerId}::uuid
			AND l.deleted_at IS NULL
			AND e.entry_date BETWEEN ${query.from}::date AND ${query.to}::date`,
	];

	if (query.accountIds.length > 0) {
		clauses.push(sql`AND EXISTS (
			SELECT 1 FROM journal_line f
			WHERE f.entry_id = e.id AND f.deleted_at IS NULL
			AND f.account_id IN ${idList(query.accountIds)})`);
	}

	if (query.categoryIds.length > 0) {
		clauses.push(sql`AND EXISTS (
			SELECT 1 FROM journal_line g
			WHERE g.entry_id = e.id AND g.deleted_at IS NULL
			AND g.account_id IN ${idList(query.categoryIds)})`);
	}

	return sql.join(clauses, sql` `);
}

function onlyAskedCategories(query: SummaryQuery): SQL {
	return query.categoryIds.length > 0
		? sql`AND l.account_id IN ${idList(query.categoryIds)}`
		: sql``;
}

export function createSummaryRepository(db: Executor): SummaryRepository {
	return {
		totals: async (query) => {
			const rows = await db.execute<{ income_minor: string; expense_minor: string }>(sql`
				SELECT
					COALESCE(SUM(l.base_amount_minor) FILTER (WHERE a.nature = 'INCOME' AND l.side = 'CREDIT'), 0)::bigint AS income_minor,
					COALESCE(SUM(l.base_amount_minor) FILTER (WHERE a.nature = 'EXPENSE' AND l.side = 'DEBIT'), 0)::bigint AS expense_minor
				${scope(query)} ${onlyAskedCategories(query)}`);

			const row = rows[0];
			return {
				incomeMinor: BigInt(row?.income_minor ?? 0),
				expenseMinor: BigInt(row?.expense_minor ?? 0),
			};
		},

		expenseByCategory: async (query) => {
			const rows = await db.execute<{ category_id: string; expense_minor: string }>(sql`
				SELECT l.account_id AS category_id, SUM(l.base_amount_minor)::bigint AS expense_minor
				${scope(query)} ${onlyAskedCategories(query)}
				AND a.nature = 'EXPENSE' AND l.side = 'DEBIT'
				GROUP BY l.account_id`);

			return rows.map((row) => ({
				categoryId: row.category_id,
				expenseMinor: toMinor(row.expense_minor),
			}));
		},

		expenseByAccount: async (query) => {
			const rows = await db.execute<{ account_id: string; expense_minor: string }>(sql`
				SELECT l.account_id AS account_id, SUM(l.base_amount_minor)::bigint AS expense_minor
				${scope(query)}
				AND a.nature IN ('ASSET', 'LIABILITY') AND l.side = 'CREDIT'
				AND EXISTS (
					SELECT 1 FROM journal_line d
					JOIN account da ON da.id = d.account_id
					WHERE d.entry_id = e.id AND d.deleted_at IS NULL
					AND d.side = 'DEBIT' AND da.nature = 'EXPENSE')
				GROUP BY l.account_id`);

			return rows.map((row) => ({
				accountId: row.account_id,
				expenseMinor: toMinor(row.expense_minor),
			}));
		},

		dailyTotals: async (query) => {
			const rows = await db.execute<{
				period_date: string;
				income_minor: string;
				expense_minor: string;
			}>(sql`
				SELECT e.entry_date AS period_date,
					COALESCE(SUM(l.base_amount_minor) FILTER (WHERE a.nature = 'INCOME' AND l.side = 'CREDIT'), 0)::bigint AS income_minor,
					COALESCE(SUM(l.base_amount_minor) FILTER (WHERE a.nature = 'EXPENSE' AND l.side = 'DEBIT'), 0)::bigint AS expense_minor
				${scope(query)} ${onlyAskedCategories(query)}
				GROUP BY e.entry_date
				ORDER BY e.entry_date`);

			return rows.map((row) => ({
				periodDate: String(row.period_date).slice(0, 10),
				incomeMinor: toMinor(row.income_minor),
				expenseMinor: toMinor(row.expense_minor),
			}));
		},
	};
}
