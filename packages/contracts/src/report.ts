import { z } from "zod";

export const summaryBucket = z.enum(["DAY", "MONTH"]);

export type SummaryBucket = z.infer<typeof summaryBucket>;

export interface CategorySummaryNode {
	categoryId: string;
	name: string;
	expenseMinor: number;
	children: CategorySummaryNode[];
}

export const categorySummaryNode: z.ZodType<CategorySummaryNode> = z.lazy(() =>
	z.object({
		categoryId: z.uuid(),
		name: z.string(),
		expenseMinor: z.number().int(),
		children: z.array(categorySummaryNode),
	}),
);

export const accountSummary = z.object({
	accountId: z.uuid(),
	name: z.string(),
	expenseMinor: z.number().int(),
});

export type AccountSummary = z.infer<typeof accountSummary>;

export const periodSummaryPoint = z.object({
	periodStart: z.string(),
	incomeMinor: z.number().int(),
	expenseMinor: z.number().int(),
	netMinor: z.number().int(),
});

export type PeriodSummaryPoint = z.infer<typeof periodSummaryPoint>;

export const monthlySummary = z.object({
	ledgerId: z.uuid(),
	month: z.string(),
	currency: z.string().length(3),
	incomeMinor: z.number().int(),
	expenseMinor: z.number().int(),
	netMinor: z.number().int(),
	byCategory: z.array(categorySummaryNode),
	byAccount: z.array(accountSummary),
});

export type MonthlySummary = z.infer<typeof monthlySummary>;

export const periodSummary = z.object({
	ledgerId: z.uuid(),
	from: z.string(),
	to: z.string(),
	currency: z.string().length(3),
	incomeMinor: z.number().int(),
	expenseMinor: z.number().int(),
	netMinor: z.number().int(),
	bucket: summaryBucket,
	series: z.array(periodSummaryPoint),
	byCategory: z.array(categorySummaryNode),
	byAccount: z.array(accountSummary),
});

export type PeriodSummary = z.infer<typeof periodSummary>;
