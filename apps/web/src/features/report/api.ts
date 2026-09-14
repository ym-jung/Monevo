import { api } from "@/lib/api/client";
import type { MonthlySummary, PeriodSummary, SummaryBucket } from "@/lib/api/types";

export function getMonthlySummary(
	ledgerId: string,
	month: string,
	accountId?: string[],
	categoryId?: string[],
): Promise<MonthlySummary> {
	return api.get<MonthlySummary>(`ledgers/${ledgerId}/summary`, { query: { month, accountId, categoryId } });
}

export function getPeriodSummary(
	ledgerId: string,
	from: string,
	to: string,
	bucket: SummaryBucket,
	accountId?: string[],
	categoryId?: string[],
): Promise<PeriodSummary> {
	return api.get<PeriodSummary>(`ledgers/${ledgerId}/analysis`, {
		query: { from, to, bucket, accountId, categoryId },
	});
}
