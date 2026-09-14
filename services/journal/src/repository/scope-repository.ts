import type { Executor } from "@monevo/db";
import { sql } from "drizzle-orm";
import { ForbiddenError, NotFoundError, ValidationError } from "@monevo/http";

import type { UsableAccount } from "../domain/shape.ts";
import { idList } from "./sql.ts";

export interface ScopeRepository {
	requireLedgerMember(ledgerId: string, actorId: string): Promise<void>;
	baseCurrencyOf(ledgerId: string): Promise<string>;
	accountsByIds(accountIds: readonly string[]): Promise<Map<string, UsableAccount>>;
	accountsWithParents(accountIds: readonly string[]): Promise<Map<string, UsableAccount>>;
	isLinkedToLedger(accountId: string, ledgerId: string): Promise<boolean>;
	hasChildren(categoryId: string): Promise<boolean>;
	selfAndChildIds(categoryIds: readonly string[], ledgerId: string): Promise<string[]>;
	requireUsableAccounts(accountIds: readonly string[], ledgerId: string): Promise<void>;
	exponents(): Promise<Map<string, number>>;
	displayNames(userIds: readonly string[]): Promise<Map<string, string>>;
}

interface AccountRowShape extends Record<string, unknown> {
	id: string;
	name: string;
	nature: string;
	subtype: string;
	currency: string | null;
	parent_id: string | null;
	archived_at: string | null;
	ledger_id: string | null;
}

const ACCOUNT_COLUMNS = sql`id, name, nature, subtype, currency, parent_id, archived_at, ledger_id`;

function toUsable(row: AccountRowShape): UsableAccount {
	return {
		id: row.id,
		name: row.name,
		nature: row.nature,
		subtype: row.subtype,
		currency: row.currency?.trim() ?? null,
		parentId: row.parent_id,
		archivedAt: row.archived_at,
		ledgerId: row.ledger_id,
	};
}

export function createScopeRepository(db: Executor): ScopeRepository {
	const accountsByIds = async (accountIds: readonly string[]) => {
		if (accountIds.length === 0) return new Map<string, UsableAccount>();

		const rows = await db.execute<AccountRowShape>(sql`
			SELECT ${ACCOUNT_COLUMNS} FROM account
			WHERE id IN ${idList(accountIds)} AND deleted_at IS NULL`);

		return new Map(rows.map((row) => [row.id, toUsable(row)]));
	};

	const exists = async (query: ReturnType<typeof sql>) =>
		(await db.execute<{ ok: boolean }>(query))[0]?.ok === true;

	return {
		requireLedgerMember: async (ledgerId, actorId) => {
			if (
				!(await exists(sql`SELECT EXISTS (
					SELECT 1 FROM app_user WHERE id = ${actorId}::uuid
					AND deleted_at IS NULL AND status = 'ACTIVE') AS ok`))
			) {
				throw new ForbiddenError("FORBIDDEN");
			}

			if (
				!(await exists(sql`SELECT EXISTS (
					SELECT 1 FROM ledger WHERE id = ${ledgerId}::uuid AND deleted_at IS NULL) AS ok`))
			) {
				throw new NotFoundError("LEDGER_NOT_FOUND");
			}

			if (
				!(await exists(sql`SELECT EXISTS (
					SELECT 1 FROM ledger_member WHERE ledger_id = ${ledgerId}::uuid
					AND user_id = ${actorId}::uuid AND deleted_at IS NULL) AS ok`))
			) {
				throw new ForbiddenError("LEDGER_NOT_MEMBER");
			}
		},

		baseCurrencyOf: async (ledgerId) => {
			const rows = await db.execute<{ currency: string }>(sql`
				SELECT currency FROM ledger WHERE id = ${ledgerId}::uuid AND deleted_at IS NULL`);

			const currency = rows[0]?.currency;
			if (!currency) throw new NotFoundError("LEDGER_NOT_FOUND");

			return currency.trim();
		},

		accountsByIds,

		accountsWithParents: async (accountIds) => {
			const found = await accountsByIds(accountIds);

			const parentIds = [
				...new Set(
					[...found.values()]
						.map((account) => account.parentId)
						.filter((id): id is string => id !== null && !found.has(id)),
				),
			];

			for (const [id, parent] of await accountsByIds(parentIds)) found.set(id, parent);

			return found;
		},

		isLinkedToLedger: (accountId, ledgerId) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM ledger_account WHERE ledger_id = ${ledgerId}::uuid
				AND account_id = ${accountId}::uuid AND deleted_at IS NULL) AS ok`),

		hasChildren: (categoryId) =>
			exists(sql`SELECT EXISTS (
				SELECT 1 FROM account WHERE parent_id = ${categoryId}::uuid
				AND deleted_at IS NULL) AS ok`),

		selfAndChildIds: async (categoryIds, ledgerId) => {
			if (categoryIds.length === 0) return [];

			const rows = await db.execute<{ id: string; ledger_id: string | null }>(sql`
				SELECT id, ledger_id FROM account
				WHERE id IN ${idList(categoryIds)} AND deleted_at IS NULL AND subtype = 'CATEGORY'`);

			if (rows.length !== categoryIds.length) throw new NotFoundError("CATEGORY_NOT_FOUND");
			for (const row of rows) {
				if (row.ledger_id !== ledgerId) throw new ValidationError("CATEGORY_LEDGER_MISMATCH");
			}

			const children = await db.execute<{ id: string }>(sql`
				SELECT id FROM account
				WHERE parent_id IN ${idList(categoryIds)} AND deleted_at IS NULL`);

			return [...new Set([...categoryIds, ...children.map((row) => row.id)])];
		},

		requireUsableAccounts: async (accountIds, ledgerId) => {
			if (accountIds.length === 0) return;

			const rows = await db.execute<{ n: string }>(sql`
				SELECT COUNT(*)::bigint AS n FROM ledger_account
				WHERE ledger_id = ${ledgerId}::uuid AND account_id IN ${idList(accountIds)}
				AND deleted_at IS NULL`);

			if (Number(rows[0]?.n ?? 0) !== accountIds.length) {
				throw new ForbiddenError("ACCOUNT_NOT_ACCESSIBLE");
			}
		},

		exponents: async () => {
			const rows = await db.execute<{ code: string; minor_unit_exponent: number }>(sql`
				SELECT code, minor_unit_exponent FROM currency`);

			return new Map(rows.map((row) => [row.code.trim(), row.minor_unit_exponent]));
		},

		displayNames: async (userIds) => {
			const unique = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
			if (unique.length === 0) return new Map();

			const rows = await db.execute<{ id: string; display_name: string }>(sql`
				SELECT id, display_name FROM app_user WHERE id IN ${idList(unique)}`);

			return new Map(rows.map((row) => [row.id, row.display_name]));
		},
	};
}
