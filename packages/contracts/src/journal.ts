import { z } from "zod";

import { accountNature, accountSubtype } from "./account.ts";

export const journalEntryKind = z.enum(["EXPENSE", "INCOME", "TRANSFER", "SPLIT", "OPENING"]);
export const journalLineSide = z.enum(["DEBIT", "CREDIT"]);
export const fxRateSource = z.enum(["SAME_CURRENCY", "FX_SERVICE", "MANUAL", "DERIVED"]);

export type JournalEntryKind = z.infer<typeof journalEntryKind>;
export type JournalLineSide = z.infer<typeof journalLineSide>;
export type FxRateSource = z.infer<typeof fxRateSource>;

export const journalLineInput = z.object({
	side: journalLineSide,
	accountId: z.uuid(),
	amountMinor: z.number().int().positive(),
	currency: z.string().regex(/^[A-Z]{3}$/).nullish(),
	fxRate: z.string().nullish(),
	memo: z.string().nullish(),
});

export type JournalLineInput = z.infer<typeof journalLineInput>;

export const journalEntryCreateRequest = z.object({
	clientRequestId: z.uuid().nullish(),
	ledgerId: z.uuid(),
	entryDate: z.string(),
	description: z.string().trim().min(1).max(200),
	memo: z.string().nullish(),
	lines: z.array(journalLineInput).min(2).max(191),
});

export type JournalEntryCreateRequest = z.infer<typeof journalEntryCreateRequest>;

export const journalEntryUpdateRequest = z.object({
	entryDate: z.string().nullish(),
	description: z.string().max(200).nullish(),
	memo: z.string().nullish(),
	lines: z.array(journalLineInput).min(2).max(191).nullish(),
	version: z.number().int(),
});

export type JournalEntryUpdateRequest = z.infer<typeof journalEntryUpdateRequest>;

export const accountRef = z.object({
	id: z.uuid(),
	name: z.string(),
	parentName: z.string().nullable(),
	nature: accountNature,
	subtype: accountSubtype,
	currency: z.string().nullable(),
});

export type AccountRef = z.infer<typeof accountRef>;

export const userRef = z.object({ id: z.uuid(), displayName: z.string() });

export type UserRef = z.infer<typeof userRef>;

export const journalLineView = z.object({
	id: z.uuid(),
	lineNo: z.number().int(),
	side: journalLineSide,
	account: accountRef.nullable(),
	amountMinor: z.number().int(),
	currency: z.string(),
	baseAmountMinor: z.number().int(),
	fxRate: z.string(),
	fxRateSource: fxRateSource,
	fxRateAsOf: z.string().nullable(),
	memo: z.string().nullable(),
});

export type JournalLineView = z.infer<typeof journalLineView>;

export const journalEntryDetail = z.object({
	id: z.uuid(),
	ledgerId: z.uuid().nullable(),
	kind: journalEntryKind,
	entryDate: z.string(),
	description: z.string(),
	memo: z.string().nullable(),
	baseCurrency: z.string().nullable(),
	baseAmountMinor: z.number().int(),
	lines: z.array(journalLineView),
	createdBy: userRef.nullable(),
	createdAt: z.string(),
	updatedBy: userRef.nullable(),
	updatedAt: z.string(),
	version: z.number().int(),
});

export type JournalEntryDetail = z.infer<typeof journalEntryDetail>;

export const journalEntrySummary = z.object({
	id: z.uuid(),
	kind: journalEntryKind,
	entryDate: z.string(),
	description: z.string(),
	lineCount: z.number().int(),
	baseAmountMinor: z.number().int(),
	amountMinor: z.number().int().nullable(),
	currency: z.string().nullable(),
	primaryAccount: accountRef.nullable(),
	counterAccount: accountRef.nullable(),
});

export type JournalEntrySummary = z.infer<typeof journalEntrySummary>;
