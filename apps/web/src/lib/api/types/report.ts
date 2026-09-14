export interface CategorySummaryNode {
	categoryId: string;
	name: string;
	expenseMinor: number;
	children: CategorySummaryNode[];
}

export interface AccountSummary {
	accountId: string;
	name: string;
	expenseMinor: number;
}

export interface MonthlySummary {
	ledgerId: string;

	month: string;

	currency: string;
	incomeMinor: number;
	expenseMinor: number;
	netMinor: number;
	byCategory: CategorySummaryNode[];
	byAccount: AccountSummary[];
}

export type SummaryBucket = "DAY" | "MONTH";

export interface PeriodSummaryPoint {
	periodStart: string;
	incomeMinor: number;
	expenseMinor: number;
	netMinor: number;
}

export interface PeriodSummary {
	ledgerId: string;
	from: string;
	to: string;
	currency: string;
	incomeMinor: number;
	expenseMinor: number;
	netMinor: number;
	bucket: SummaryBucket;
	series: PeriodSummaryPoint[];
	byCategory: CategorySummaryNode[];
	byAccount: AccountSummary[];
}
