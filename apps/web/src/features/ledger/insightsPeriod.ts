import type { SummaryBucket } from "@/lib/api/types";

import { monthRange } from "./monthNav";

export type InsightMode = "month" | "year" | "range";

export interface InsightPeriod {
	from: string;
	to: string;
	bucket: SummaryBucket;
}

const DAY_MS = 86_400_000;

const DAILY_BUCKET_MAX_DAYS = 62;

export function inclusiveDays(from: string, to: string): number {
	const start = new Date(`${from}T00:00:00`).getTime();
	const end = new Date(`${to}T00:00:00`).getTime();
	return Math.floor((end - start) / DAY_MS) + 1;
}

export function insightPeriod(
	mode: InsightMode,
	month: string,
	year: number,
	rangeFrom: string,
	rangeTo: string,
): InsightPeriod {
	if (mode === "month") {
		return { ...monthRange(month), bucket: "DAY" };
	}
	if (mode === "year") {
		return { from: `${year}-01-01`, to: `${year}-12-31`, bucket: "MONTH" };
	}
	return {
		from: rangeFrom,
		to: rangeTo,
		bucket: inclusiveDays(rangeFrom, rangeTo) > DAILY_BUCKET_MAX_DAYS ? "MONTH" : "DAY",
	};
}
