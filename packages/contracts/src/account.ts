import { z } from "zod";

export const accountType = z.enum(["BANK", "CASH", "E_MONEY", "CREDIT_CARD"]);
export const accountNature = z.enum(["ASSET", "LIABILITY", "EQUITY", "EXPENSE", "INCOME"]);
export const accountSubtype = z.enum(["REAL", "CATEGORY", "SYSTEM"]);
export const categoryKind = z.enum(["EXPENSE", "INCOME"]);

export type AccountType = z.infer<typeof accountType>;
export type AccountNature = z.infer<typeof accountNature>;
export type AccountSubtype = z.infer<typeof accountSubtype>;
export type CategoryKind = z.infer<typeof categoryKind>;

export const accountCreateRequest = z.object({
	name: z.string().trim().min(1).max(50),
	type: accountType,
	currency: z.string().regex(/^[A-Z]{3}$/),
	ledgerIds: z.array(z.uuid()).max(50).default([]),
	openingBalanceMinor: z.number().int().default(0),
	memo: z.string().max(200).nullish(),
});

export type AccountCreateRequest = z.infer<typeof accountCreateRequest>;

export const accountUpdateRequest = z.object({
	name: z.string().trim().min(1).max(50).nullish(),
	memo: z.string().max(200).nullish(),
	archived: z.boolean().nullish(),
	version: z.number().int(),
});

export type AccountUpdateRequest = z.infer<typeof accountUpdateRequest>;

export const accountDetail = z.object({
	id: z.uuid(),
	name: z.string(),
	type: accountType.nullable(),
	nature: accountNature,
	subtype: accountSubtype,
	currency: z.string().length(3).nullable(),
	ownerUserId: z.uuid().nullable(),
	ownerDisplayName: z.string().nullable(),
	ledgerIds: z.array(z.uuid()),
	balanceMinor: z.number().int(),
	archived: z.boolean(),
	version: z.number().int(),
});

export type AccountDetail = z.infer<typeof accountDetail>;

export const accountBalanceResponse = z.object({
	accountId: z.uuid(),
	currency: z.string().length(3).nullable(),
	balanceMinor: z.number().int(),
});

export type AccountBalanceResponse = z.infer<typeof accountBalanceResponse>;

export const categoryCreateRequest = z.object({
	name: z.string().trim().min(1).max(40),
	kind: categoryKind,
	parentId: z.uuid().nullish(),
});

export type CategoryCreateRequest = z.infer<typeof categoryCreateRequest>;

export const categoryUpdateRequest = z.object({
	name: z.string().trim().min(1).max(40).nullish(),
	sortOrder: z.number().int().nullish(),
});

export type CategoryUpdateRequest = z.infer<typeof categoryUpdateRequest>;

export interface CategoryNode {
	id: string;
	name: string;
	kind: CategoryKind;
	isSystem: boolean;
	sortOrder: number;
	children: CategoryNode[];
}

export const categoryNode: z.ZodType<CategoryNode> = z.lazy(() =>
	z.object({
		id: z.uuid(),
		name: z.string(),
		kind: categoryKind,
		isSystem: z.boolean(),
		sortOrder: z.number().int(),
		children: z.array(categoryNode),
	}),
);
