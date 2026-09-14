import type { MonthlySummary, PeriodSummary, SummaryBucket } from "@monevo/contracts";
import { minorToNumber, toMinor } from "@monevo/money";

import { normalizedIds, parseMonth, validatePeriod } from "../domain/period.ts";
import { rollUp, toAccountSummaries, toSeries } from "../domain/summary.ts";
import type { ScopeRepository } from "../repository/scope-repository.ts";
import type { SummaryQuery, SummaryRepository } from "../repository/summary-repository.ts";

export interface Repositories {
	summaries: SummaryRepository;
	scopes: ScopeRepository;
}

export type RunInSnapshot = <T>(run: (repositories: Repositories) => Promise<T>) => Promise<T>;

export interface SummaryRequest {
	ledgerId: string;
	accountIds?: readonly string[];
	categoryIds?: readonly string[];
	requesterId: string;
}

export interface SummaryService {
	monthly(request: SummaryRequest & { month: string }): Promise<MonthlySummary>;
	period(
		request: SummaryRequest & { from: string; to: string; bucket: SummaryBucket },
	): Promise<PeriodSummary>;
}

export function createSummaryService(
	summaries: SummaryRepository,
	scopes: ScopeRepository,
	runInSnapshot: RunInSnapshot,
): SummaryService {
	async function resolveScope(request: SummaryRequest) {
		await scopes.requireMember(request.ledgerId, request.requesterId);

		const accountIds = normalizedIds(request.accountIds, "accountId");
		const categoryIds = normalizedIds(request.categoryIds, "categoryId");

		await scopes.requireUsableAccounts(accountIds, request.ledgerId);

		return {
			accountIds,
			categoryIds: await scopes.selfAndChildIds(categoryIds, request.ledgerId),
			currency: await scopes.baseCurrencyOf(request.ledgerId),
		};
	}

	async function summarize(query: SummaryQuery, tx: Repositories) {
		const [totals, accountTotals, categoryTotals] = await Promise.all([
			tx.summaries.totals(query),
			tx.summaries.expenseByAccount(query),
			tx.summaries.expenseByCategory(query),
		]);

		const [categories, accountNames] = await Promise.all([
			tx.scopes.categoriesByIds(categoryTotals.map((total) => total.categoryId)),
			tx.scopes.accountNamesByIds(accountTotals.map((total) => total.accountId)),
		]);

		return {
			incomeMinor: minorToNumber(toMinor(totals.incomeMinor)),
			expenseMinor: minorToNumber(toMinor(totals.expenseMinor)),
			netMinor: minorToNumber(toMinor(totals.incomeMinor - totals.expenseMinor)),
			byCategory: rollUp(categoryTotals, categories),
			byAccount: toAccountSummaries(accountTotals, accountNames),
		};
	}

	return {
		monthly: async (request) => {
			const { month, from, to } = parseMonth(request.month);
			const scope = await resolveScope(request);

			const values = await runInSnapshot((tx) =>
				summarize({ ledgerId: request.ledgerId, from, to, ...scope }, tx),
			);

			return { ledgerId: request.ledgerId, month, currency: scope.currency, ...values };
		},

		period: async (request) => {
			validatePeriod(request.from, request.to);

			const scope = await resolveScope(request);
			const query = {
				ledgerId: request.ledgerId,
				from: request.from,
				to: request.to,
				...scope,
			};
			const { values, daily } = await runInSnapshot(async (tx) => ({
				values: await summarize(query, tx),
				daily: await tx.summaries.dailyTotals(query),
			}));

			return {
				ledgerId: request.ledgerId,
				from: request.from,
				to: request.to,
				currency: scope.currency,
				...values,
				bucket: request.bucket,
				series: toSeries(request.from, request.to, request.bucket, daily),
			};
		},
	};
}
