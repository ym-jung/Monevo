import { ForbiddenError, NotFoundError } from "@monevo/http";

import type { MemberRow } from "../repository/ledger-repository.ts";
import type { LedgerRepository } from "../repository/ledger-repository.ts";
import type { MemberRepository } from "../repository/member-repository.ts";
import type { ScopeRepository } from "../repository/scope-repository.ts";

export interface AccessChecker {
	requireMember(ledgerId: string, actorId: string): Promise<MemberRow>;
	requireOwner(ledgerId: string, actorId: string): Promise<MemberRow>;
	canReadLedger(ledgerId: string, actorId: string): Promise<boolean>;
}

export function createAccessChecker(
	ledgers: LedgerRepository,
	members: MemberRepository,
	scopes: ScopeRepository,
): AccessChecker {
	const requireMember = async (ledgerId: string, actorId: string): Promise<MemberRow> => {
		if (!(await scopes.isActiveUser(actorId))) {
			throw new ForbiddenError("FORBIDDEN");
		}

		if (!(await ledgers.findById(ledgerId))) {
			throw new NotFoundError("LEDGER_NOT_FOUND");
		}

		const member = await members.find(ledgerId, actorId);
		if (!member) {
			throw new ForbiddenError("LEDGER_NOT_MEMBER");
		}

		return member;
	};

	return {
		requireMember,

		requireOwner: async (ledgerId, actorId) => {
			const member = await requireMember(ledgerId, actorId);
			if (member.role !== "OWNER") {
				throw new ForbiddenError("LEDGER_OWNER_REQUIRED");
			}

			return member;
		},

		canReadLedger: async (ledgerId, actorId) => (await members.find(ledgerId, actorId)) !== undefined,
	};
}
