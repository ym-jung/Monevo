import { ForbiddenError, NotFoundError } from "@monevo/http";

import type { AccountRow } from "../repository/account-repository.ts";
import type { AccountRepository } from "../repository/account-repository.ts";
import type { ScopeRepository } from "../repository/scope-repository.ts";

export interface AccessChecker {
	requireLedgerMember(ledgerId: string, actorId: string): Promise<void>;
	requireRealAccount(accountId: string): Promise<AccountRow>;
	requireOwnedAccount(accountId: string, actorId: string): Promise<AccountRow>;
	requireVisibleAccount(accountId: string, actorId: string): Promise<AccountRow>;
	requireShareTarget(ledgerId: string, actorId: string): Promise<void>;
}

export function createAccessChecker(
	accounts: AccountRepository,
	scopes: ScopeRepository,
): AccessChecker {
	const requireLedgerMember = async (ledgerId: string, actorId: string): Promise<void> => {
		if (!(await scopes.isActiveUser(actorId))) throw new ForbiddenError("FORBIDDEN");
		if (!(await scopes.ledgerExists(ledgerId))) throw new NotFoundError("LEDGER_NOT_FOUND");
		if (!(await scopes.isMember(ledgerId, actorId))) throw new ForbiddenError("LEDGER_NOT_MEMBER");
	};

	const requireRealAccount = async (accountId: string): Promise<AccountRow> => {
		const account = await accounts.findById(accountId, "REAL");
		if (!account) throw new NotFoundError("ACCOUNT_NOT_FOUND");

		return account;
	};

	return {
		requireLedgerMember,
		requireRealAccount,

		requireOwnedAccount: async (accountId, actorId) => {
			const account = await requireRealAccount(accountId);
			if (account.owner_user_id !== actorId) {
				throw new ForbiddenError("ACCOUNT_NOT_ACCESSIBLE");
			}

			return account;
		},

		requireVisibleAccount: async (accountId, actorId) => {
			const account = await requireRealAccount(accountId);
			if (account.owner_user_id === actorId) return account;

			const ledgerIds = await scopes.accessibleLedgerIds(actorId);
			if (await scopes.isLinkedToAny(accountId, ledgerIds)) return account;

			throw new ForbiddenError("ACCOUNT_NOT_ACCESSIBLE");
		},

		requireShareTarget: async (ledgerId, actorId) => {
			if (!(await scopes.isMember(ledgerId, actorId))) {
				throw new ForbiddenError("ACCOUNT_SHARE_TARGET_INVALID");
			}
		},
	};
}
