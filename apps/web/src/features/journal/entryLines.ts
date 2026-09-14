import type { JournalEntryKind, JournalLineInput } from "@/lib/api/types";

export interface SplitDraft {
	categoryId: string;
	amountMinor: number;
	memo: string;
}

export interface EntryDraft {
	kind: JournalEntryKind;
	description: string;
	date: string;
	accountId: string;
	counterAccountId: string;
	availableCounterIds: string[];
	availableCategoryIds: string[];
	amountMinor: number;
	counterMinor: number;
	exchange: boolean;
	splits: SplitDraft[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isTransfer(draft: EntryDraft): boolean {
	return draft.kind === "TRANSFER";
}

function isSingle(draft: EntryDraft): boolean {
	return draft.splits.length === 1;
}

export function buildEntryLines(draft: EntryDraft): JournalLineInput[] {
	if (isTransfer(draft)) {
		const counter = draft.counterAccountId || draft.availableCounterIds[0];
		return [
			{ side: "DEBIT", accountId: counter, amountMinor: draft.exchange ? draft.counterMinor : draft.amountMinor },
			{ side: "CREDIT", accountId: draft.accountId, amountMinor: draft.amountMinor },
		];
	}

	const single = isSingle(draft);
	const legs = draft.splits.map((split) => ({
		accountId: split.categoryId || draft.availableCategoryIds[0],
		amountMinor: single ? draft.amountMinor : split.amountMinor,
		memo: split.memo.trim() || undefined,
	}));

	const money = { side: "CREDIT" as const, accountId: draft.accountId, amountMinor: draft.amountMinor };

	return draft.kind === "INCOME"
		? [{ ...money, side: "DEBIT" as const }, ...legs.map((leg) => ({ side: "CREDIT" as const, ...leg }))]
		: [...legs.map((leg) => ({ side: "DEBIT" as const, ...leg })), money];
}

export function canSaveEntry(draft: EntryDraft): boolean {
	if (draft.amountMinor <= 0) return false;
	if (draft.description.trim().length === 0) return false;
	if (!ISO_DATE.test(draft.date)) return false;

	if (isTransfer(draft)) {
		return draft.availableCounterIds.length > 0 && (!draft.exchange || draft.counterMinor > 0);
	}

	const single = isSingle(draft);
	return draft.availableCategoryIds.length > 0
		&& draft.splits.every((split) => (single ? true : split.amountMinor > 0));
}
