import { z } from "zod";

export const ledgerMemberRole = z.enum(["OWNER", "MEMBER"]);

export type LedgerMemberRole = z.infer<typeof ledgerMemberRole>;

export const ledgerCreateRequest = z.object({
	name: z.string().trim().min(1).max(100),
	currency: z.string().regex(/^[A-Z]{3}$/),
	timezone: z.string().trim().min(1).max(64),
	confirmCurrencyIrreversible: z.boolean().default(false),
});

export type LedgerCreateRequest = z.infer<typeof ledgerCreateRequest>;

export const ledgerUpdateRequest = z.object({
	name: z.string().trim().min(1).max(100),
	version: z.number().int(),
});

export type LedgerUpdateRequest = z.infer<typeof ledgerUpdateRequest>;

export const ledgerDetail = z.object({
	id: z.uuid(),
	name: z.string(),
	currency: z.string().length(3),
	myRole: ledgerMemberRole,
	memberCount: z.number().int(),
	ownerUserId: z.uuid(),
	createdAt: z.string(),
	version: z.number().int(),
});

export type LedgerDetail = z.infer<typeof ledgerDetail>;

export const ledgerMemberDetail = z.object({
	id: z.uuid(),
	ledgerId: z.uuid(),
	userId: z.uuid(),
	displayName: z.string().nullable(),
	role: ledgerMemberRole,
	joinedAt: z.string(),
});

export type LedgerMemberDetail = z.infer<typeof ledgerMemberDetail>;

export const ledgerInviteRequest = z.object({
	expiresInDays: z.number().int().min(1).max(30).nullish(),
	maxUses: z.number().int().min(1).max(10).nullish(),
});

export type LedgerInviteRequest = z.infer<typeof ledgerInviteRequest>;

export const ledgerInviteResponse = z.object({
	id: z.uuid(),
	code: z.string(),
	expiresAt: z.string(),
	maxUses: z.number().int(),
	usedCount: z.number().int(),
});

export type LedgerInviteResponse = z.infer<typeof ledgerInviteResponse>;

export const ledgerInviteAcceptResponse = z.object({
	ledgerId: z.uuid(),
	name: z.string(),
	currency: z.string().length(3),
	role: ledgerMemberRole,
});

export type LedgerInviteAcceptResponse = z.infer<typeof ledgerInviteAcceptResponse>;
