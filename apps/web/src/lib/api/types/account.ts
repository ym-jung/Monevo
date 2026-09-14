import type { AccountNature, AccountSubtype, AccountType } from "./enums";

export interface AccountDetail {
	id: string;
	name: string;
	type: AccountType;

	currency: string;
	nature: AccountNature;
	subtype: AccountSubtype;
	ownerUserId: string;
	ownerDisplayName: string;
	ledgerIds: string[];

	balanceMinor: number;
	archived: boolean;
	version: number;
}

export interface AccountCreateRequest {
	name: string;
	type: AccountType;
	currency: string;

	ledgerIds?: string[];
	openingBalanceMinor?: number;
	memo?: string;
}

export interface AccountUpdateRequest {
	name?: string;
	memo?: string;
	archived?: boolean;
	version: number;
}

export interface AccountBalanceResponse {
	accountId: string;
	currency: string;
	balanceMinor: number;
}
