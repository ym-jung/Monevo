import type { Executor } from "@monevo/db";
import { sql } from "drizzle-orm";
import { ForbiddenError, NotFoundError, ValidationError } from "@monevo/http";

import type { NamedCategory } from "../domain/summary.ts";
import { idList } from "./sql.ts";

export interface ScopeRepository {
	requireMember(ledgerId: string, actorId: string): Promise<void>;
	baseCurrencyOf(ledgerId: string): Promise<string>;
	requireUsableAccounts(accountIds: readonly string[], ledgerId: string): Promise<void>;
	selfAndChildIds(categoryIds: readonly string[], ledgerId: string): Promise<string[]>;
	categoriesByIds(categoryIds: readonly string[]): Promise<Map<string, NamedCategory>>;
	accountNamesByIds(accountIds: readonly string[]): Promise<Map<string, string>>;
}

export function createScopeRepository(db: Executor): ScopeRepository {
	const categoryRows = async (ids: readonly string[]) => {
		if (ids.length === 0) return [];

		return db.execute<{ id: string; name: string; parent_id: string | null; ledger_id: string | null }>(sql`
			SELECT id, name, parent_id, ledger_id FROM account
			WHERE id IN ${idList(ids)} AND deleted_at IS NULL AND subtype = 'CATEGORY'`);
	};

	return {
		requireMember: async (ledgerId, actorId) => {
			const active = await db.execute<{ ok: boolean }>(sql`
				SELECT EXISTS (
					SELECT 1 FROM app_user
					WHERE id = ${actorId}::uuid AND deleted_at IS NULL AND status = 'ACTIVE') AS ok`);

			if (!active[0]?.ok) {
				throw new ForbiddenError("FORBIDDEN");
			}

			const ledger = await db.execute<{ ok: boolean }>(sql`
				SELECT EXISTS (
					SELECT 1 FROM ledger WHERE id = ${ledgerId}::uuid AND deleted_at IS NULL) AS ok`);

			if (!ledger[0]?.ok) {
				throw new NotFoundError("LEDGER_NOT_FOUND");
			}

			const member = await db.execute<{ ok: boolean }>(sql`
				SELECT EXISTS (
					SELECT 1 FROM ledger_member
					WHERE ledger_id = ${ledgerId}::uuid AND user_id = ${actorId}::uuid
					AND deleted_at IS NULL) AS ok`);

			if (!member[0]?.ok) {
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

		requireUsableAccounts: async (accountIds, ledgerId) => {
			if (accountIds.length === 0) return;

			const rows = await db.execute<{ linked: string }>(sql`
				SELECT COUNT(*)::bigint AS linked FROM ledger_account
				WHERE ledger_id = ${ledgerId}::uuid AND account_id IN ${idList(accountIds)}
				AND deleted_at IS NULL`);

			if (Number(rows[0]?.linked ?? 0) !== accountIds.length) {
				throw new ForbiddenError("ACCOUNT_NOT_ACCESSIBLE");
			}
		},

		selfAndChildIds: async (categoryIds, ledgerId) => {
			if (categoryIds.length === 0) return [];

			const found = await categoryRows(categoryIds);
			if (found.length !== categoryIds.length) {
				throw new NotFoundError("CATEGORY_NOT_FOUND");
			}
			for (const row of found) {
				if (row.ledger_id !== ledgerId) throw new ValidationError("CATEGORY_LEDGER_MISMATCH");
			}

			const children = await db.execute<{ id: string }>(sql`
				SELECT id FROM account
				WHERE parent_id IN ${idList(categoryIds)} AND deleted_at IS NULL`);

			return [...new Set([...categoryIds, ...children.map((row) => row.id)])];
		},

		categoriesByIds: async (categoryIds) => {
			const found = await categoryRows(categoryIds);
			const byId = new Map<string, NamedCategory>(
				found.map((row) => [row.id, { id: row.id, name: row.name, parentId: row.parent_id }]),
			);

			const parentIds = [
				...new Set(
					found
						.map((row) => row.parent_id)
						.filter((id): id is string => id !== null && !byId.has(id)),
				),
			];

			if (parentIds.length === 0) return byId;

			const parents = await db.execute<{ id: string; name: string; parent_id: string | null }>(sql`
				SELECT id, name, parent_id FROM account
				WHERE id IN ${idList(parentIds)} AND deleted_at IS NULL`);

			for (const row of parents) {
				byId.set(row.id, { id: row.id, name: row.name, parentId: row.parent_id });
			}

			return byId;
		},

		accountNamesByIds: async (accountIds) => {
			if (accountIds.length === 0) return new Map();

			const rows = await db.execute<{ id: string; name: string }>(sql`
				SELECT id, name FROM account
				WHERE id IN ${idList(accountIds)} AND deleted_at IS NULL`);

			return new Map(rows.map((row) => [row.id, row.name]));
		},
	};
}
