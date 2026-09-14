import type { Executor } from "@monevo/db";
import { newId } from "@monevo/db";
import { sql } from "drizzle-orm";

import { idList } from "./sql.ts";

export interface ScopeRepository {
	isActiveUser(userId: string): Promise<boolean>;
	ledgerExists(ledgerId: string): Promise<boolean>;
	isMember(ledgerId: string, userId: string): Promise<boolean>;
	accessibleLedgerIds(userId: string): Promise<string[]>;
	displayNames(userIds: readonly string[]): Promise<Map<string, string>>;
	currencyExists(code: string): Promise<boolean>;

	linkedLedgerIds(accountIds: readonly string[]): Promise<Map<string, string[]>>;
	isLinked(ledgerId: string, accountId: string): Promise<boolean>;
	isLinkedToAny(accountId: string, ledgerIds: readonly string[]): Promise<boolean>;
	countLinked(ledgerId: string, accountIds: readonly string[]): Promise<number>;
	link(ledgerId: string, accountId: string, actorId: string): Promise<void>;
	unlink(ledgerId: string, accountId: string, actorId: string): Promise<void>;
	unlinkAllForAccount(accountId: string, actorId: string): Promise<void>;

	hasAnyLine(accountId: string): Promise<boolean>;
	hasNonOpeningLine(accountId: string): Promise<boolean>;
	openingEntryExists(marker: string): Promise<boolean>;
	recordOpeningBalance(input: {
		marker: string;
		ownerUserId: string;
		accountId: string;
		equityAccountId: string;
		currency: string;
		amountMinor: bigint;
		positive: boolean;
	}): Promise<void>;
	discardOpeningBalance(marker: string, actorId: string): Promise<void>;
}

export function createScopeRepository(db: Executor): ScopeRepository {
	const exists = async (query: ReturnType<typeof sql>): Promise<boolean> => {
		const rows = await db.execute<{ ok: boolean }>(query);
		return rows[0]?.ok === true;
	};

	return {
		isActiveUser: (userId) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM app_user
				WHERE id = ${userId}::uuid AND deleted_at IS NULL AND status = 'ACTIVE') AS ok`),

		ledgerExists: (ledgerId) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM ledger WHERE id = ${ledgerId}::uuid AND deleted_at IS NULL) AS ok`),

		isMember: (ledgerId, userId) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM ledger_member
				WHERE ledger_id = ${ledgerId}::uuid AND user_id = ${userId}::uuid
				AND deleted_at IS NULL) AS ok`),

		accessibleLedgerIds: async (userId) => {
			const rows = await db.execute<{ ledger_id: string }>(sql`
				SELECT ledger_id FROM ledger_member
				WHERE user_id = ${userId}::uuid AND deleted_at IS NULL`);

			return rows.map((row) => row.ledger_id);
		},

		displayNames: async (userIds) => {
			if (userIds.length === 0) return new Map();

			const rows = await db.execute<{ id: string; display_name: string }>(sql`
				SELECT id, display_name FROM app_user
				WHERE id IN ${idList(userIds)} AND deleted_at IS NULL`);

			return new Map(rows.map((row) => [row.id, row.display_name]));
		},

		currencyExists: (code) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM currency WHERE code = ${code} AND is_active) AS ok`),

		linkedLedgerIds: async (accountIds) => {
			if (accountIds.length === 0) return new Map();

			const rows = await db.execute<{ account_id: string; ledger_id: string }>(sql`
				SELECT account_id, ledger_id FROM ledger_account
				WHERE account_id IN ${idList(accountIds)} AND deleted_at IS NULL`);

			const byAccount = new Map<string, string[]>();
			for (const row of rows) {
				const current = byAccount.get(row.account_id) ?? [];
				current.push(row.ledger_id);
				byAccount.set(row.account_id, current);
			}

			return byAccount;
		},

		isLinked: (ledgerId, accountId) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM ledger_account
				WHERE ledger_id = ${ledgerId}::uuid AND account_id = ${accountId}::uuid
				AND deleted_at IS NULL) AS ok`),

		isLinkedToAny: (accountId, ledgerIds) =>
			ledgerIds.length === 0
				? Promise.resolve(false)
				: exists(sql`SELECT EXISTS (
					SELECT 1 FROM ledger_account
					WHERE account_id = ${accountId}::uuid AND ledger_id IN ${idList(ledgerIds)}
					AND deleted_at IS NULL) AS ok`),

		countLinked: async (ledgerId, accountIds) => {
			if (accountIds.length === 0) return 0;

			const rows = await db.execute<{ n: string }>(sql`
				SELECT COUNT(*)::bigint AS n FROM ledger_account
				WHERE ledger_id = ${ledgerId}::uuid AND account_id IN ${idList(accountIds)}
				AND deleted_at IS NULL`);

			return Number(rows[0]?.n ?? 0);
		},

		link: async (ledgerId, accountId, actorId) => {
			await db.execute(sql`
				INSERT INTO ledger_account (id, ledger_id, account_id, created_by, updated_by)
				VALUES (${newId()}::uuid, ${ledgerId}::uuid, ${accountId}::uuid,
					${actorId}::uuid, ${actorId}::uuid)`);
		},

		unlink: async (ledgerId, accountId, actorId) => {
			await db.execute(sql`
				UPDATE ledger_account SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE ledger_id = ${ledgerId}::uuid AND account_id = ${accountId}::uuid
				AND deleted_at IS NULL`);
		},

		unlinkAllForAccount: async (accountId, actorId) => {
			await db.execute(sql`
				UPDATE ledger_account SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE account_id = ${accountId}::uuid AND deleted_at IS NULL`);
		},

		hasAnyLine: (accountId) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM journal_line l
				JOIN journal_entry e ON e.id = l.entry_id AND e.deleted_at IS NULL
				WHERE l.account_id = ${accountId}::uuid AND l.deleted_at IS NULL) AS ok`),

		hasNonOpeningLine: (accountId) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM journal_line l
				JOIN journal_entry e ON e.id = l.entry_id AND e.deleted_at IS NULL
				WHERE l.account_id = ${accountId}::uuid AND l.deleted_at IS NULL
				AND e.kind <> 'OPENING') AS ok`),

		openingEntryExists: (marker) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM journal_entry
				WHERE create_request_hash = ${marker} AND deleted_at IS NULL) AS ok`),

		recordOpeningBalance: async (input) => {
			const entryId = newId();
			const assetSide = input.positive ? "DEBIT" : "CREDIT";
			const equitySide = input.positive ? "CREDIT" : "DEBIT";

			await db.execute(sql`
				INSERT INTO journal_entry (id, owner_user_id, kind, entry_date, description,
					created_by_user_id, client_request_id, create_request_hash, created_by, updated_by)
				VALUES (${entryId}::uuid, ${input.ownerUserId}::uuid, 'OPENING', CURRENT_DATE,
					'Opening balance', ${input.ownerUserId}::uuid, ${newId()}::uuid, ${input.marker},
					${input.ownerUserId}::uuid, ${input.ownerUserId}::uuid)`);

			await db.execute(sql`
				INSERT INTO journal_line (id, entry_id, line_no, side, account_id, currency,
					amount_minor, fx_rate, base_amount_minor, fx_rate_source, created_by, updated_by)
				VALUES
					(${newId()}::uuid, ${entryId}::uuid, 0, ${assetSide}, ${input.accountId}::uuid,
						${input.currency}, ${input.amountMinor.toString()}::bigint, 1,
						${input.amountMinor.toString()}::bigint, 'SAME_CURRENCY',
						${input.ownerUserId}::uuid, ${input.ownerUserId}::uuid),
					(${newId()}::uuid, ${entryId}::uuid, 1, ${equitySide}, ${input.equityAccountId}::uuid,
						${input.currency}, ${input.amountMinor.toString()}::bigint, 1,
						${input.amountMinor.toString()}::bigint, 'SAME_CURRENCY',
						${input.ownerUserId}::uuid, ${input.ownerUserId}::uuid)`);
		},

		discardOpeningBalance: async (marker, actorId) => {
			await db.execute(sql`
				UPDATE journal_line l SET deleted_at = now(), deleted_by = ${actorId}::uuid
				FROM journal_entry e
				WHERE l.entry_id = e.id AND e.create_request_hash = ${marker}
				AND e.deleted_at IS NULL AND l.deleted_at IS NULL`);

			await db.execute(sql`
				UPDATE journal_entry SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE create_request_hash = ${marker} AND deleted_at IS NULL`);
		},
	};
}
