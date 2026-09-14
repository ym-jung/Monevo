import type { AccountDetail, AccountNature, AccountSubtype, AccountType } from "@monevo/contracts";

import type { AccountRow } from "../repository/account-repository.ts";

export const SORT_STEP = 10;

export function toDetail(
	row: AccountRow,
	balanceMinor: bigint,
	ownerDisplayName: string | null,
	ledgerIds: readonly string[],
): AccountDetail {
	return {
		id: row.id,
		name: row.name,
		type: (row.type as AccountType | null) ?? null,
		nature: row.nature as AccountNature,
		subtype: row.subtype as AccountSubtype,
		currency: row.currency?.trim() ?? null,
		ownerUserId: row.owner_user_id,
		ownerDisplayName,
		ledgerIds: [...ledgerIds],
		balanceMinor: Number(balanceMinor),
		archived: row.archived_at !== null,
		version: Number(row.version),
	};
}

export function openingMarker(accountId: string): string {
	return `opening:${accountId}`;
}
