import type { AccountNature, AccountSubtype, FxRateSource, JournalEntryKind, JournalLineSide } from "./enums";

export interface AccountRef {
	id: string;
	name: string;
	parentName: string | null;
	nature: AccountNature;
	subtype: AccountSubtype;
	currency: string | null;
}

export interface UserRef {
	id: string;
	displayName: string;
}

export interface JournalLineView {
	id: string;
	lineNo: number;
	side: JournalLineSide;
	account: AccountRef;
	amountMinor: number;
	currency: string;
	baseAmountMinor: number;

	fxRate: string;
	fxRateSource: FxRateSource;
	fxRateAsOf: string | null;

	memo: string | null;
}

export interface JournalEntryDetail {
	id: string;
	ledgerId: string | null;
	kind: JournalEntryKind;
	entryDate: string;
	description: string;
	memo: string | null;
	baseCurrency: string;
	baseAmountMinor: number;
	lines: JournalLineView[];
	createdBy: UserRef;
	createdAt: string;
	updatedBy: UserRef;
	updatedAt: string;
	version: number;
}

export interface JournalEntrySummary {
	id: string;
	kind: JournalEntryKind;
	entryDate: string;
	description: string;
	lineCount: number;
	baseAmountMinor: number;
	amountMinor: number | null;
	currency: string | null;
	primaryAccount: AccountRef | null;
	counterAccount: AccountRef | null;
}

export interface JournalLineInput {
	side: JournalLineSide;
	accountId: string;
	amountMinor: number;
	currency?: string;
	fxRate?: string;
}

export interface JournalEntryCreateRequest {
	clientRequestId: string;
	ledgerId: string;

	entryDate: string;
	description: string;
	memo?: string;
	lines: JournalLineInput[];
}

export interface JournalEntryUpdateRequest {
	entryDate?: string;
	description?: string;
	memo?: string;
	lines?: JournalLineInput[];
	version: number;
}

export interface JournalEntryListQuery {
	ledgerId: string;
	from?: string;
	to?: string;
	accountId?: string[];

	categoryId?: string[];
	kind?: JournalEntryKind[];
	page?: number;
	size?: number;
}
