import type { LedgerCreateRequest, LedgerDetail, LedgerUpdateRequest } from "@monevo/contracts";
import { ConflictError, NotFoundError, ValidationError } from "@monevo/http";

import { requireValidTimezone } from "../domain/timezone.ts";
import type { LedgerRow } from "../repository/ledger-repository.ts";
import type { InviteRepository } from "../repository/invite-repository.ts";
import type { LedgerRepository } from "../repository/ledger-repository.ts";
import type { MemberRepository } from "../repository/member-repository.ts";
import type { ScopeRepository } from "../repository/scope-repository.ts";
import type { AccessChecker } from "./access-checker.ts";

export interface Repositories {
	ledgers: LedgerRepository;
	members: MemberRepository;
	scopes: ScopeRepository;
	invites: InviteRepository;
}

export type RunInTransaction = <T>(run: (repositories: Repositories) => Promise<T>) => Promise<T>;

export interface LedgerService {
	listMine(userId: string): Promise<LedgerDetail[]>;
	get(ledgerId: string, requesterId: string): Promise<LedgerDetail>;
	create(request: LedgerCreateRequest, userId: string, locale: string): Promise<LedgerDetail>;
	rename(ledgerId: string, request: LedgerUpdateRequest, requesterId: string): Promise<LedgerDetail>;
	remove(ledgerId: string, requesterId: string): Promise<void>;
}

function toDetail(row: LedgerRow, role: "OWNER" | "MEMBER", memberCount: number): LedgerDetail {
	return {
		id: row.id,
		name: row.name,
		currency: row.currency.trim(),
		myRole: role,
		memberCount,
		ownerUserId: row.owner_user_id,
		createdAt: new Date(row.created_at).toISOString(),
		version: Number(row.version),
	};
}

export function createLedgerService(
	ledgers: LedgerRepository,
	members: MemberRepository,
	scopes: ScopeRepository,
	access: AccessChecker,
	runInTransaction: RunInTransaction,
): LedgerService {
	return {
		listMine: async (userId) => {
			const memberships = await members.findByUser(userId);
			if (memberships.length === 0) return [];

			const ledgerIds = memberships.map((membership) => membership.ledger_id);
			const [rows, counts] = await Promise.all([
				ledgers.findByIds(ledgerIds),
				members.countByLedgerIds(ledgerIds),
			]);

			const roleByLedger = new Map(memberships.map((m) => [m.ledger_id, m.role]));

			return rows.map((row) => toDetail(row, roleByLedger.get(row.id)!, counts.get(row.id) ?? 0));
		},

		get: async (ledgerId, requesterId) => {
			const member = await access.requireMember(ledgerId, requesterId);
			const row = await ledgers.findById(ledgerId);
			if (!row) throw new NotFoundError("LEDGER_NOT_FOUND");

			const counts = await members.countByLedgerIds([ledgerId]);

			return toDetail(row, member.role, counts.get(ledgerId) ?? 0);
		},

		create: async (request, userId, locale) => {
			if (!request.confirmCurrencyIrreversible) {
				throw new ValidationError("LEDGER_CURRENCY_CONFIRM_REQUIRED");
			}

			requireValidTimezone(request.timezone);

			const row = await runInTransaction(async (tx) => {
				const created = await tx.ledgers.insert({
					name: request.name,
					currency: request.currency,
					ownerUserId: userId,
					timezone: request.timezone,
				});

				await tx.members.insert({
					ledgerId: created.id,
					userId,
					role: "OWNER",
					inviteId: null,
					actorId: userId,
				});
				await tx.scopes.seedDefaultCategories(created.id, locale, userId);

				return created;
			});

			return toDetail(row, "OWNER", 1);
		},

		rename: async (ledgerId, request, requesterId) => {
			const member = await access.requireOwner(ledgerId, requesterId);

			const current = await ledgers.findById(ledgerId);
			if (!current) throw new NotFoundError("LEDGER_NOT_FOUND");

			const updated = await ledgers.rename(ledgerId, request.name, request.version, requesterId);
			if (!updated) throw new ConflictError("CONCURRENT_MODIFICATION");

			const counts = await members.countByLedgerIds([ledgerId]);

			return toDetail(updated, member.role, counts.get(ledgerId) ?? 0);
		},

		remove: async (ledgerId, requesterId) => {
			await access.requireOwner(ledgerId, requesterId);

			if (!(await ledgers.findById(ledgerId))) {
				throw new NotFoundError("LEDGER_NOT_FOUND");
			}

			await runInTransaction(async (tx) => {
				await tx.scopes.softDeleteJournalInLedger(ledgerId, requesterId);
				await tx.invites.revokeAllUsable(ledgerId);
				await tx.scopes.unlinkAllInLedger(ledgerId, requesterId);
				await tx.members.softDeleteAllInLedger(ledgerId, requesterId);
				await tx.ledgers.softDelete(ledgerId, requesterId);
			});
		},
	};
}
