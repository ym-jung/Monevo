import type { Executor } from "@monevo/db";
import { newId } from "@monevo/db";
import { sql } from "drizzle-orm";

import { idList } from "./sql.ts";

export interface AccountRow extends Record<string, unknown> {
	id: string;
	owner_user_id: string | null;
	name: string;
	type: string | null;
	currency: string | null;
	memo: string | null;
	sort_order: number;
	archived_at: string | null;
	nature: string;
	subtype: string;
	ledger_id: string | null;
	parent_id: string | null;
	is_system: boolean;
	version: string;
}

const COLUMNS = sql`id, owner_user_id, name, type, currency, memo, sort_order, archived_at,
	nature, subtype, ledger_id, parent_id, is_system, version`;

export interface AccountRepository {
	findById(accountId: string, subtype: string): Promise<AccountRow | undefined>;
	findByIds(accountIds: readonly string[]): Promise<AccountRow[]>;
	findRealOwnedBy(ownerUserId: string): Promise<AccountRow[]>;
	findRealLinkedToLedger(ledgerId: string): Promise<AccountRow[]>;
	findCategoriesInLedger(ledgerId: string): Promise<AccountRow[]>;
	findChildren(parentId: string): Promise<AccountRow[]>;
	countRealOwnedBy(ownerUserId: string): Promise<number>;
	countRootCategories(ledgerId: string): Promise<number>;
	countChildren(parentId: string): Promise<number>;
	hasChildren(parentId: string): Promise<boolean>;
	insertReal(input: {
		ownerUserId: string;
		name: string;
		type: string;
		currency: string;
		memo: string | null;
		sortOrder: number;
	}): Promise<AccountRow>;
	insertCategory(input: {
		ledgerId: string;
		parentId: string | null;
		name: string;
		nature: string;
		sortOrder: number;
		actorId: string;
	}): Promise<AccountRow>;
	findOrCreateEquity(ownerUserId: string): Promise<AccountRow>;
	update(
		accountId: string,
		changes: { name?: string; memo?: string | null; archived?: boolean },
		expectedVersion: number,
		actorId: string,
	): Promise<AccountRow | undefined>;
	updateCategory(
		categoryId: string,
		changes: { name?: string; sortOrder?: number },
		actorId: string,
	): Promise<AccountRow | undefined>;
	softDelete(accountId: string, actorId: string): Promise<void>;
	balances(accountIds: readonly string[]): Promise<Map<string, bigint>>;
}

export function createAccountRepository(db: Executor): AccountRepository {
	return {
		findById: async (accountId, subtype) => {
			const rows = await db.execute<AccountRow>(sql`
				SELECT ${COLUMNS} FROM account
				WHERE id = ${accountId}::uuid AND subtype = ${subtype} AND deleted_at IS NULL`);

			return rows[0];
		},

		findByIds: async (accountIds) => {
			if (accountIds.length === 0) return [];

			return db.execute<AccountRow>(sql`
				SELECT ${COLUMNS} FROM account
				WHERE id IN ${idList(accountIds)} AND deleted_at IS NULL`);
		},

		findRealOwnedBy: async (ownerUserId) =>
			db.execute<AccountRow>(sql`
				SELECT ${COLUMNS} FROM account
				WHERE owner_user_id = ${ownerUserId}::uuid AND subtype = 'REAL' AND deleted_at IS NULL
				ORDER BY sort_order ASC, name ASC`),

		findRealLinkedToLedger: async (ledgerId) =>
			db.execute<AccountRow>(sql`
				SELECT ${sql.raw("a.id, a.owner_user_id, a.name, a.type, a.currency, a.memo, a.sort_order, a.archived_at, a.nature, a.subtype, a.ledger_id, a.parent_id, a.is_system, a.version")}
				FROM account a
				JOIN ledger_account la ON la.account_id = a.id AND la.deleted_at IS NULL
				WHERE la.ledger_id = ${ledgerId}::uuid AND a.subtype = 'REAL' AND a.deleted_at IS NULL
				ORDER BY a.sort_order ASC, a.name ASC`),

		findCategoriesInLedger: async (ledgerId) =>
			db.execute<AccountRow>(sql`
				SELECT ${COLUMNS} FROM account
				WHERE ledger_id = ${ledgerId}::uuid AND subtype = 'CATEGORY' AND deleted_at IS NULL
				ORDER BY sort_order ASC, name ASC`),

		findChildren: async (parentId) =>
			db.execute<AccountRow>(sql`
				SELECT ${COLUMNS} FROM account
				WHERE parent_id = ${parentId}::uuid AND deleted_at IS NULL
				ORDER BY sort_order ASC, name ASC`),

		countRealOwnedBy: async (ownerUserId) => {
			const rows = await db.execute<{ n: string }>(sql`
				SELECT COUNT(*)::bigint AS n FROM account
				WHERE owner_user_id = ${ownerUserId}::uuid AND subtype = 'REAL' AND deleted_at IS NULL`);

			return Number(rows[0]?.n ?? 0);
		},

		countRootCategories: async (ledgerId) => {
			const rows = await db.execute<{ n: string }>(sql`
				SELECT COUNT(*)::bigint AS n FROM account
				WHERE ledger_id = ${ledgerId}::uuid AND subtype = 'CATEGORY'
				AND parent_id IS NULL AND deleted_at IS NULL`);

			return Number(rows[0]?.n ?? 0);
		},

		countChildren: async (parentId) => {
			const rows = await db.execute<{ n: string }>(sql`
				SELECT COUNT(*)::bigint AS n FROM account
				WHERE parent_id = ${parentId}::uuid AND deleted_at IS NULL`);

			return Number(rows[0]?.n ?? 0);
		},

		hasChildren: async (parentId) => {
			const rows = await db.execute<{ ok: boolean }>(sql`
				SELECT EXISTS (
					SELECT 1 FROM account
					WHERE parent_id = ${parentId}::uuid AND deleted_at IS NULL) AS ok`);

			return rows[0]?.ok === true;
		},

		insertReal: async (input) => {
			const nature = input.type === "CREDIT_CARD" ? "LIABILITY" : "ASSET";
			const rows = await db.execute<AccountRow>(sql`
				INSERT INTO account (id, owner_user_id, name, type, nature, subtype, currency, memo,
					sort_order, is_system, created_by, updated_by)
				VALUES (${newId()}::uuid, ${input.ownerUserId}::uuid, ${input.name}, ${input.type},
					${nature}, 'REAL', ${input.currency}, ${input.memo}, ${input.sortOrder}, FALSE,
					${input.ownerUserId}::uuid, ${input.ownerUserId}::uuid)
				RETURNING ${COLUMNS}`);

			return rows[0]!;
		},

		insertCategory: async (input) => {
			const rows = await db.execute<AccountRow>(sql`
				INSERT INTO account (id, ledger_id, parent_id, name, nature, subtype, sort_order,
					is_system, created_by, updated_by)
				VALUES (${newId()}::uuid, ${input.ledgerId}::uuid,
					${input.parentId ? sql`${input.parentId}::uuid` : sql`NULL`},
					${input.name}, ${input.nature}, 'CATEGORY', ${input.sortOrder}, FALSE,
					${input.actorId}::uuid, ${input.actorId}::uuid)
				RETURNING ${COLUMNS}`);

			return rows[0]!;
		},

		findOrCreateEquity: async (ownerUserId) => {
			const existing = await db.execute<AccountRow>(sql`
				SELECT ${COLUMNS} FROM account
				WHERE owner_user_id = ${ownerUserId}::uuid AND subtype = 'SYSTEM' AND deleted_at IS NULL
				ORDER BY id LIMIT 1`);

			if (existing[0]) return existing[0];

			const rows = await db.execute<AccountRow>(sql`
				INSERT INTO account (id, owner_user_id, name, nature, subtype, sort_order, is_system,
					created_by, updated_by)
				VALUES (${newId()}::uuid, ${ownerUserId}::uuid, 'Opening balances', 'EQUITY', 'SYSTEM',
					0, TRUE, ${ownerUserId}::uuid, ${ownerUserId}::uuid)
				RETURNING ${COLUMNS}`);

			return rows[0]!;
		},

		update: async (accountId, changes, expectedVersion, actorId) => {
			const sets = [sql`version = version + 1`, sql`updated_by = ${actorId}::uuid`];
			if (changes.name !== undefined) sets.push(sql`name = ${changes.name}`);
			if (changes.memo !== undefined) sets.push(sql`memo = ${changes.memo}`);
			if (changes.archived !== undefined) {
				sets.push(changes.archived ? sql`archived_at = now()` : sql`archived_at = NULL`);
			}

			const rows = await db.execute<AccountRow>(sql`
				UPDATE account SET ${sql.join(sets, sql`, `)}
				WHERE id = ${accountId}::uuid AND deleted_at IS NULL AND version = ${expectedVersion}
				RETURNING ${COLUMNS}`);

			return rows[0];
		},

		updateCategory: async (categoryId, changes, actorId) => {
			const sets = [sql`updated_by = ${actorId}::uuid`];
			if (changes.name !== undefined) sets.push(sql`name = ${changes.name}`);
			if (changes.sortOrder !== undefined) sets.push(sql`sort_order = ${changes.sortOrder}`);

			const rows = await db.execute<AccountRow>(sql`
				UPDATE account SET ${sql.join(sets, sql`, `)}
				WHERE id = ${categoryId}::uuid AND deleted_at IS NULL
				RETURNING ${COLUMNS}`);

			return rows[0];
		},

		softDelete: async (accountId, actorId) => {
			await db.execute(sql`
				UPDATE account SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE id = ${accountId}::uuid AND deleted_at IS NULL`);
		},

		balances: async (accountIds) => {
			if (accountIds.length === 0) return new Map();

			const rows = await db.execute<{ account_id: string; balance_minor: string }>(sql`
				SELECT account_id, balance_minor FROM v_account_balance
				WHERE account_id IN ${idList(accountIds)}`);

			return new Map(rows.map((row) => [row.account_id, BigInt(row.balance_minor ?? 0)]));
		},
	};
}
