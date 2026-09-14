import type { JournalEntrySummary } from "@/lib/api/types";

export interface LedgerRow {
	id: string;
	kind: JournalEntrySummary["kind"];
	entryDate: string;
	description: string;
	lineCount: number;
	accountName: string | null;
	categoryId: string | null;
	amountMinor: number;
	currency: string;
	baseAmountMinor: number;
}

export function signOf(kind: LedgerRow["kind"]): 1 | -1 {
	return kind === "INCOME" ? 1 : -1;
}

export function moneyKind(kind: LedgerRow["kind"]): "income" | "transfer" | undefined {
	if (kind === "INCOME") return "income";
	if (kind === "TRANSFER") return "transfer";
	return undefined;
}

export function hasConvertedAmount(row: LedgerRow, baseCurrency: string): boolean {
	return row.currency !== baseCurrency;
}

export function isSplit(row: LedgerRow): boolean {
	return row.lineCount > 2;
}

export function toRow(entry: JournalEntrySummary, baseCurrency: string): LedgerRow {
	const counter = entry.counterAccount;
	return {
		id: entry.id,
		kind: entry.kind,
		entryDate: entry.entryDate,
		description: entry.description,
		lineCount: entry.lineCount,
		accountName: entry.primaryAccount?.name ?? null,
		categoryId: counter?.subtype === "CATEGORY" ? counter.id : null,
		amountMinor: entry.amountMinor ?? entry.baseAmountMinor,
		currency: entry.currency ?? baseCurrency,
		baseAmountMinor: entry.baseAmountMinor,
	};
}
