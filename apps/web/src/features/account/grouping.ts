import type { AccountDetail } from "@/lib/api/types";

export interface AccountGroups {
	linked: AccountDetail[];
	unlinked: AccountDetail[];
	archived: AccountDetail[];
}

export function groupAccounts(
	ledgerAccounts: readonly AccountDetail[],
	ownedAccounts: readonly AccountDetail[],
): AccountGroups {
	const archived = ownedAccounts.filter((account) => account.archived);
	const archivedIds = new Set(archived.map((account) => account.id));

	const linked = ledgerAccounts.filter((account) => !archivedIds.has(account.id));
	const linkedIds = new Set(linked.map((account) => account.id));

	const unlinked = ownedAccounts.filter(
		(account) => !account.archived && !linkedIds.has(account.id),
	);

	return { linked, unlinked, archived };
}
