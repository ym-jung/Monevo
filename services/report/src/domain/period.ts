import { ValidationError } from "@monevo/http";
import type { SummaryBucket } from "@monevo/contracts";

export const MAX_FILTER_IDS = 50;
export const MAX_PERIOD_DAYS = 366;

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(value: string, field: string): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
		throw new ValidationError("VALIDATION_FAILED", [
			{ field, issue: "Pattern", value },
		]);
	}
	return value;
}

export function parseMonth(value: string): { month: string; from: string; to: string } {
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
		throw new ValidationError("VALIDATION_FAILED", [
			{ field: "month", issue: "Pattern", value },
		]);
	}

	const year = Number(value.slice(0, 4));
	const monthNumber = Number(value.slice(5, 7));
	const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

	return {
		month: value,
		from: `${value}-01`,
		to: `${value}-${String(lastDay).padStart(2, "0")}`,
	};
}

export function validatePeriod(from: string, to: string): void {
	if (from > to) {
		throw new ValidationError("VALIDATION_FAILED", [
			{ field: "from", issue: "Range", value: from },
		]);
	}

	if (daysBetween(from, to) + 1 > MAX_PERIOD_DAYS) {
		throw new ValidationError("VALIDATION_FAILED", [
			{ field: "to", issue: "Max", value: to },
		]);
	}
}

export function normalizedIds(ids: readonly string[] | undefined, field: string): string[] {
	if (!ids || ids.length === 0) return [];

	const unique = [...new Set(ids)];
	if (unique.length > MAX_FILTER_IDS) {
		throw new ValidationError("VALIDATION_FAILED", [
			{ field, issue: "Size", value: String(unique.length) },
		]);
	}

	return unique;
}

export function bucketKey(date: string, bucket: SummaryBucket): string {
	return bucket === "DAY" ? date : `${date.slice(0, 7)}-01`;
}

export function bucketStarts(from: string, to: string, bucket: SummaryBucket): string[] {
	const starts: string[] = [];
	let cursor = bucketKey(from, bucket);
	const last = bucketKey(to, bucket);

	while (cursor <= last) {
		starts.push(cursor);
		cursor = bucket === "DAY" ? addDays(cursor, 1) : addMonths(cursor, 1);
	}

	return starts;
}

function daysBetween(from: string, to: string): number {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

function addDays(date: string, days: number): string {
	return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function addMonths(date: string, months: number): string {
	const year = Number(date.slice(0, 4));
	const month = Number(date.slice(5, 7));
	const shifted = new Date(Date.UTC(year, month - 1 + months, 1));

	return shifted.toISOString().slice(0, 10);
}
