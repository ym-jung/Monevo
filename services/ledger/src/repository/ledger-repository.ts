import type { Executor } from "@monevo/db";
import { newId } from "@monevo/db";
import { sql } from "drizzle-orm";

import { idList } from "./sql.ts";

export interface LedgerRow extends Record<string, unknown> {
	id: string;
	name: string;
	currency: string;
	owner_user_id: string;
	timezone: string;
	created_at: string;
	version: string;
}

export interface MemberRow extends Record<string, unknown> {
	id: string;
	ledger_id: string;
	user_id: string;
	role: "OWNER" | "MEMBER";
	joined_at: string;
}

export interface LedgerRepository {
	findById(ledgerId: string): Promise<LedgerRow | undefined>;
	findByIds(ledgerIds: readonly string[]): Promise<LedgerRow[]>;
	insert(input: {
		name: string;
		currency: string;
		ownerUserId: string;
		timezone: string;
	}): Promise<LedgerRow>;
	rename(ledgerId: string, name: string, expectedVersion: number, actorId: string): Promise<LedgerRow | undefined>;
	softDelete(ledgerId: string, actorId: string): Promise<void>;
}

export function createLedgerRepository(db: Executor): LedgerRepository {
	const selectOne = async (ledgerId: string) => {
		const rows = await db.execute<LedgerRow>(sql`
			SELECT id, name, currency, owner_user_id, timezone, created_at, version
			FROM ledger WHERE id = ${ledgerId}::uuid AND deleted_at IS NULL`);

		return rows[0];
	};

	return {
		findById: selectOne,

		findByIds: async (ledgerIds) => {
			if (ledgerIds.length === 0) return [];

			return db.execute<LedgerRow>(sql`
				SELECT id, name, currency, owner_user_id, timezone, created_at, version
				FROM ledger WHERE id IN ${idList(ledgerIds)} AND deleted_at IS NULL`);
		},

		insert: async (input) => {
			const rows = await db.execute<LedgerRow>(sql`
				INSERT INTO ledger (id, name, currency, owner_user_id, timezone, created_by, updated_by)
				VALUES (${newId()}::uuid, ${input.name}, ${input.currency}, ${input.ownerUserId}::uuid,
					${input.timezone}, ${input.ownerUserId}::uuid, ${input.ownerUserId}::uuid)
				RETURNING id, name, currency, owner_user_id, timezone, created_at, version`);

			return rows[0]!;
		},

		rename: async (ledgerId, name, expectedVersion, actorId) => {
			const rows = await db.execute<LedgerRow>(sql`
				UPDATE ledger SET name = ${name}, version = version + 1, updated_by = ${actorId}::uuid
				WHERE id = ${ledgerId}::uuid AND deleted_at IS NULL AND version = ${expectedVersion}
				RETURNING id, name, currency, owner_user_id, timezone, created_at, version`);

			return rows[0];
		},

		softDelete: async (ledgerId, actorId) => {
			await db.execute(sql`
				UPDATE ledger SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE id = ${ledgerId}::uuid AND deleted_at IS NULL`);
		},
	};
}
