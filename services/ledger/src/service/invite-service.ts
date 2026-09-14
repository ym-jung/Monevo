import type {
	LedgerInviteAcceptResponse,
	LedgerInviteRequest,
	LedgerInviteResponse,
} from "@monevo/contracts";
import { ConflictError, GoneError, NotFoundError } from "@monevo/http";

import {
	DEFAULT_EXPIRATION_DAYS,
	DEFAULT_MAX_USES,
	MAX_CODE_ATTEMPTS,
	expiresAt,
	normalizeCode,
	randomCode,
} from "../domain/invite-code.ts";
import type { InviteRow } from "../repository/invite-repository.ts";
import type { InviteRepository } from "../repository/invite-repository.ts";
import type { LedgerRepository } from "../repository/ledger-repository.ts";
import type { MemberRepository } from "../repository/member-repository.ts";
import type { AccessChecker } from "./access-checker.ts";
import type { RunInTransaction } from "./ledger-service.ts";

export interface InviteService {
	issue(
		ledgerId: string,
		requesterId: string,
		request: LedgerInviteRequest | undefined,
	): Promise<LedgerInviteResponse>;
	listUsable(ledgerId: string, requesterId: string): Promise<LedgerInviteResponse[]>;
	revoke(ledgerId: string, inviteId: string, requesterId: string): Promise<void>;
	revokeAll(ledgerId: string): Promise<void>;
	accept(code: string, requesterId: string): Promise<LedgerInviteAcceptResponse>;
}

function toResponse(row: InviteRow): LedgerInviteResponse {
	return {
		id: row.id,
		code: row.code,
		expiresAt: new Date(row.expires_at).toISOString(),
		maxUses: row.max_uses,
		usedCount: row.used_count,
	};
}

function isUsable(row: InviteRow, now: Date): boolean {
	return (
		row.revoked_at === null &&
		new Date(row.expires_at).getTime() > now.getTime() &&
		row.used_count < row.max_uses
	);
}

export function createInviteService(
	invites: InviteRepository,
	ledgers: LedgerRepository,
	members: MemberRepository,
	access: AccessChecker,
	runInTransaction: RunInTransaction,
): InviteService {
	async function uniqueCode(): Promise<string> {
		for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
			const code = randomCode();
			if (!(await invites.existsByCode(code))) return code;
		}

		throw new Error(`could not generate a unique invite code in ${MAX_CODE_ATTEMPTS} attempts`);
	}

	return {
		issue: async (ledgerId, requesterId, request) => {
			await access.requireOwner(ledgerId, requesterId);

			const row = await invites.insert({
				ledgerId,
				code: await uniqueCode(),
				createdByUserId: requesterId,
				expiresAt: expiresAt(new Date(), request?.expiresInDays ?? DEFAULT_EXPIRATION_DAYS),
				maxUses: request?.maxUses ?? DEFAULT_MAX_USES,
			});

			return toResponse(row);
		},

		listUsable: async (ledgerId, requesterId) => {
			await access.requireOwner(ledgerId, requesterId);

			const now = new Date();

			return (await invites.findByLedger(ledgerId))
				.filter((row) => isUsable(row, now))
				.map(toResponse);
		},

		revoke: async (ledgerId, inviteId, requesterId) => {
			await access.requireOwner(ledgerId, requesterId);

			const row = await invites.findByIdInLedger(inviteId, ledgerId);
			if (!row) throw new NotFoundError("INVITE_NOT_FOUND");

			await invites.revoke(inviteId);
		},

		revokeAll: async (ledgerId) => {
			await invites.revokeAllUsable(ledgerId);
		},

		accept: async (code, requesterId) => {
			const row = await invites.findByCode(normalizeCode(code));
			if (!row) throw new NotFoundError("INVITE_NOT_FOUND");

			if (row.revoked_at !== null) throw new GoneError("INVITE_REVOKED");

			const now = new Date();
			if (new Date(row.expires_at).getTime() <= now.getTime()) {
				throw new GoneError("INVITE_EXPIRED");
			}
			if (row.used_count >= row.max_uses) throw new ConflictError("INVITE_EXHAUSTED");

			if (await access.canReadLedger(row.ledger_id, requesterId)) {
				throw new ConflictError("INVITE_ALREADY_MEMBER");
			}

			await runInTransaction(async (tx) => {
				if (!(await tx.invites.claim(row.id))) {
					throw new ConflictError("INVITE_EXHAUSTED");
				}

				await tx.members.insert({
					ledgerId: row.ledger_id,
					userId: requesterId,
					role: "MEMBER",
					inviteId: row.id,
					actorId: requesterId,
				});
			});

			const ledger = await ledgers.findById(row.ledger_id);
			if (!ledger) throw new NotFoundError("LEDGER_NOT_FOUND");

			return {
				ledgerId: ledger.id,
				name: ledger.name,
				currency: ledger.currency.trim(),
				role: "MEMBER",
			};
		},
	};
}
