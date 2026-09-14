import type { LedgerMemberRole } from "./enums";

export interface LedgerDetail {
	id: string;
	name: string;

	currency: string;
	myRole: LedgerMemberRole;
	memberCount: number;
	ownerUserId: string;
	createdAt: string;
	version: number;
}

export interface LedgerCreateRequest {
	name: string;
	currency: string;
	timezone: string;

	confirmCurrencyIrreversible: boolean;
}

export interface LedgerUpdateRequest {
	name: string;
	version: number;
}

export interface LedgerMemberDetail {
	id: string;
	ledgerId: string;
	userId: string;
	displayName: string;
	role: LedgerMemberRole;
	joinedAt: string;
}

export interface LedgerInviteRequest {

	expiresInDays?: number;

	maxUses?: number;
}

export interface LedgerInviteResponse {
	id: string;

	code: string;
	expiresAt: string;
	maxUses: number;
	usedCount: number;
}

export interface LedgerInviteAcceptResponse {
	ledgerId: string;
	name: string;
	currency: string;
	role: LedgerMemberRole;
}
