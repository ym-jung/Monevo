import type { LedgerMemberDetail } from "@monevo/contracts";
import { ConflictError, ForbiddenError } from "@monevo/http";

import type { MemberRepository } from "../repository/member-repository.ts";
import type { ScopeRepository } from "../repository/scope-repository.ts";
import type { AccessChecker } from "./access-checker.ts";

export interface MemberService {
	list(ledgerId: string, requesterId: string): Promise<LedgerMemberDetail[]>;
	leave(ledgerId: string, requesterId: string): Promise<void>;
	evict(ledgerId: string, targetUserId: string, requesterId: string): Promise<void>;
}

export function createMemberService(
	members: MemberRepository,
	scopes: ScopeRepository,
	access: AccessChecker,
): MemberService {
	return {
		list: async (ledgerId, requesterId) => {
			await access.requireMember(ledgerId, requesterId);

			const rows = await members.findByLedger(ledgerId);
			if (rows.length === 0) return [];

			const names = await members.displayNames(rows.map((row) => row.user_id));

			return rows.map((row) => ({
				id: row.id,
				ledgerId: row.ledger_id,
				userId: row.user_id,
				displayName: names.get(row.user_id) ?? null,
				role: row.role,
				joinedAt: new Date(row.joined_at).toISOString(),
			}));
		},

		leave: async (ledgerId, requesterId) => {
			const me = await access.requireMember(ledgerId, requesterId);
			if (me.role === "OWNER") throw new ConflictError("LEDGER_OWNER_CANNOT_LEAVE");

			await scopes.unlinkOwnedAccounts(ledgerId, requesterId, requesterId);
			await members.softDelete(me.id, requesterId);
		},

		evict: async (ledgerId, targetUserId, requesterId) => {
			await access.requireOwner(ledgerId, requesterId);

			const target = await members.find(ledgerId, targetUserId);
			if (!target) throw new ForbiddenError("LEDGER_NOT_MEMBER");
			if (target.role === "OWNER") throw new ConflictError("LEDGER_OWNER_CANNOT_LEAVE");

			await scopes.unlinkOwnedAccounts(ledgerId, targetUserId, requesterId);
			await members.softDelete(target.id, requesterId);
		},
	};
}
