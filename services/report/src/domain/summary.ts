import type {
	AccountSummary,
	CategorySummaryNode,
	PeriodSummaryPoint,
	SummaryBucket,
} from "@monevo/contracts";
import type { Minor } from "@monevo/money";
import { minorToNumber, toMinor } from "@monevo/money";

import { bucketKey, bucketStarts } from "./period.ts";

export const UNKNOWN_NAME = "Unknown";

export interface CategoryTotal {
	categoryId: string;
	expenseMinor: Minor;
}

export interface AccountTotal {
	accountId: string;
	expenseMinor: Minor;
}

export interface DailyTotal {
	periodDate: string;
	incomeMinor: Minor;
	expenseMinor: Minor;
}

export interface NamedCategory {
	id: string;
	name: string;
	parentId: string | null;
}

export function rollUp(
	leafTotals: readonly CategoryTotal[],
	categories: ReadonlyMap<string, NamedCategory>,
): CategorySummaryNode[] {
	const ownSpendByRoot = new Map<string, bigint>();
	const childrenByRoot = new Map<string, CategorySummaryNode[]>();

	for (const leaf of leafTotals) {
		const parentId = categories.get(leaf.categoryId)?.parentId ?? null;

		if (parentId === null) {
			ownSpendByRoot.set(leaf.categoryId, (ownSpendByRoot.get(leaf.categoryId) ?? 0n) + leaf.expenseMinor);
			continue;
		}

		const siblings = childrenByRoot.get(parentId) ?? [];
		siblings.push({
			categoryId: leaf.categoryId,
			name: nameOf(categories, leaf.categoryId),
			expenseMinor: minorToNumber(leaf.expenseMinor),
			children: [],
		});
		childrenByRoot.set(parentId, siblings);
	}

	const rootIds = new Set<string>([...ownSpendByRoot.keys(), ...childrenByRoot.keys()]);

	const result = [...rootIds].map((rootId) => {
		const children = [...(childrenByRoot.get(rootId) ?? [])].sort(byAmountThenName);
		let childTotal = 0n;
		for (const child of children) childTotal += BigInt(child.expenseMinor);

		return {
			categoryId: rootId,
			name: nameOf(categories, rootId),
			expenseMinor: minorToNumber(toMinor((ownSpendByRoot.get(rootId) ?? 0n) + childTotal)),
			children,
		};
	});

	return result.sort(byAmountThenName);
}

export function toAccountSummaries(
	totals: readonly AccountTotal[],
	names: ReadonlyMap<string, string>,
): AccountSummary[] {
	return totals
		.map((total) => ({
			accountId: total.accountId,
			name: names.get(total.accountId) ?? UNKNOWN_NAME,
			expenseMinor: minorToNumber(total.expenseMinor),
		}))
		.sort(byAmountThenName);
}

export function toSeries(
	from: string,
	to: string,
	bucket: SummaryBucket,
	dailyTotals: readonly DailyTotal[],
): PeriodSummaryPoint[] {
	const amounts = new Map<string, { income: bigint; expense: bigint }>();

	for (const daily of dailyTotals) {
		const key = bucketKey(daily.periodDate, bucket);
		const current = amounts.get(key) ?? { income: 0n, expense: 0n };

		current.income += daily.incomeMinor;
		current.expense += daily.expenseMinor;
		amounts.set(key, current);
	}

	return bucketStarts(from, to, bucket).map((periodStart) => {
		const value = amounts.get(periodStart) ?? { income: 0n, expense: 0n };

		return {
			periodStart,
			incomeMinor: minorToNumber(toMinor(value.income)),
			expenseMinor: minorToNumber(toMinor(value.expense)),
			netMinor: minorToNumber(toMinor(value.income - value.expense)),
		};
	});
}

function byAmountThenName(
	left: { expenseMinor: number; name: string },
	right: { expenseMinor: number; name: string },
): number {
	return right.expenseMinor - left.expenseMinor || left.name.localeCompare(right.name);
}

function nameOf(categories: ReadonlyMap<string, NamedCategory>, id: string): string {
	return categories.get(id)?.name ?? UNKNOWN_NAME;
}
