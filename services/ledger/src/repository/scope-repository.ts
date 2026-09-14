import type { Executor } from "@monevo/db";
import { newId } from "@monevo/db";
import { sql } from "drizzle-orm";

import en from "../seed/default-categories-en.json" with { type: "json" };
import ja from "../seed/default-categories-ja.json" with { type: "json" };
import ko from "../seed/default-categories-ko.json" with { type: "json" };

const SORT_STEP = 10;

interface SeedNode {
	kind: "EXPENSE" | "INCOME";
	name: string;
	children: string[];
}

const SEEDS: Record<string, SeedNode[]> = {
	en: en.categories as SeedNode[],
	ko: ko.categories as SeedNode[],
	ja: ja.categories as SeedNode[],
};

export interface ScopeRepository {
	isActiveUser(userId: string): Promise<boolean>;
	seedDefaultCategories(ledgerId: string, locale: string, actorId: string): Promise<number>;
	unlinkOwnedAccounts(ledgerId: string, ownerUserId: string, actorId: string): Promise<void>;
	unlinkAllInLedger(ledgerId: string, actorId: string): Promise<void>;
	softDeleteJournalInLedger(ledgerId: string, actorId: string): Promise<void>;
}

export function createScopeRepository(db: Executor): ScopeRepository {
	return {
		isActiveUser: async (userId) => {
			const rows = await db.execute<{ ok: boolean }>(sql`
				SELECT EXISTS (
					SELECT 1 FROM app_user
					WHERE id = ${userId}::uuid AND deleted_at IS NULL AND status = 'ACTIVE') AS ok`);

			return rows[0]?.ok === true;
		},

		seedDefaultCategories: async (ledgerId, locale, actorId) => {
			const nodes = SEEDS[locale] ?? SEEDS["en"]!;

			const roots = nodes.map((node, index) => ({
				id: newId(),
				name: node.name,
				nature: node.kind,
				sortOrder: index * SORT_STEP,
				children: node.children,
			}));

			const values = [];
			for (const root of roots) {
				values.push(sql`(${root.id}::uuid, ${ledgerId}::uuid, NULL, ${root.name}, ${root.nature},
					'CATEGORY', TRUE, ${root.sortOrder}, ${actorId}::uuid, ${actorId}::uuid)`);

				let index = 0;
				for (const name of root.children) {
					values.push(sql`(${newId()}::uuid, ${ledgerId}::uuid, ${root.id}::uuid, ${name},
						${root.nature}, 'CATEGORY', TRUE, ${index * SORT_STEP},
						${actorId}::uuid, ${actorId}::uuid)`);
					index += 1;
				}
			}

			await db.execute(sql`
				INSERT INTO account (id, ledger_id, parent_id, name, nature, subtype, is_system,
					sort_order, created_by, updated_by)
				VALUES ${sql.join(values, sql`, `)}`);

			return values.length;
		},

		unlinkOwnedAccounts: async (ledgerId, ownerUserId, actorId) => {
			await db.execute(sql`
				UPDATE ledger_account la SET deleted_at = now(), deleted_by = ${actorId}::uuid
				FROM account a
				WHERE la.account_id = a.id AND la.ledger_id = ${ledgerId}::uuid
				AND la.deleted_at IS NULL AND a.owner_user_id = ${ownerUserId}::uuid
				AND a.subtype = 'REAL' AND a.deleted_at IS NULL`);
		},

		unlinkAllInLedger: async (ledgerId, actorId) => {
			await db.execute(sql`
				UPDATE ledger_account SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE ledger_id = ${ledgerId}::uuid AND deleted_at IS NULL`);
		},

		softDeleteJournalInLedger: async (ledgerId, actorId) => {
			await db.execute(sql`
				UPDATE journal_line l SET deleted_at = now(), deleted_by = ${actorId}::uuid
				FROM journal_entry e
				WHERE l.entry_id = e.id AND e.ledger_id = ${ledgerId}::uuid AND l.deleted_at IS NULL`);

			await db.execute(sql`
				UPDATE journal_entry SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE ledger_id = ${ledgerId}::uuid AND deleted_at IS NULL`);
		},
	};
}
