import type { Executor } from "@monevo/db";
import { newId } from "@monevo/db";
import { sql } from "drizzle-orm";

import type { MemberRow } from "./ledger-repository.ts";
import { idList } from "./sql.ts";

export interface MemberRepository {
	find(ledgerId: string, userId: string): Promise<MemberRow | undefined>;
	findByLedger(ledgerId: string): Promise<MemberRow[]>;
	findByUser(userId: string): Promise<MemberRow[]>;
	countByLedgerIds(ledgerIds: readonly string[]): Promise<Map<string, number>>;
	insert(input: {
		ledgerId: string;
		userId: string;
		role: "OWNER" | "MEMBER";
		inviteId: string | null;
		actorId: string;
	}): Promise<void>;
	softDelete(memberId: string, actorId: string): Promise<void>;
	softDeleteAllInLedger(ledgerId: string, actorId: string): Promise<void>;
	displayNames(userIds: readonly string[]): Promise<Map<string, string>>;
}

const COLUMNS = sql`id, ledger_id, user_id, role, joined_at`;

export function createMemberRepository(db: Executor): MemberRepository {
	return {
		find: async (ledgerId, userId) => {
			const rows = await db.execute<MemberRow>(sql`
				SELECT ${COLUMNS} FROM ledger_member
				WHERE ledger_id = ${ledgerId}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL`);

			return rows[0];
		},

		findByLedger: async (ledgerId) =>
			db.execute<MemberRow>(sql`
				SELECT ${COLUMNS} FROM ledger_member
				WHERE ledger_id = ${ledgerId}::uuid AND deleted_at IS NULL
				ORDER BY joined_at`),

		findByUser: async (userId) =>
			db.execute<MemberRow>(sql`
				SELECT ${COLUMNS} FROM ledger_member
				WHERE user_id = ${userId}::uuid AND deleted_at IS NULL`),

		countByLedgerIds: async (ledgerIds) => {
			if (ledgerIds.length === 0) return new Map();

			const rows = await db.execute<{ ledger_id: string; member_count: string }>(sql`
				SELECT ledger_id, COUNT(*)::bigint AS member_count FROM ledger_member
				WHERE ledger_id IN ${idList(ledgerIds)} AND deleted_at IS NULL
				GROUP BY ledger_id`);

			return new Map(rows.map((row) => [row.ledger_id, Number(row.member_count)]));
		},

		insert: async (input) => {
			await db.execute(sql`
				INSERT INTO ledger_member (id, ledger_id, user_id, role, joined_via_invite_id, created_by, updated_by)
				VALUES (${newId()}::uuid, ${input.ledgerId}::uuid, ${input.userId}::uuid, ${input.role},
					${input.inviteId ? sql`${input.inviteId}::uuid` : sql`NULL`},
					${input.actorId}::uuid, ${input.actorId}::uuid)`);
		},

		softDelete: async (memberId, actorId) => {
			await db.execute(sql`
				UPDATE ledger_member SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE id = ${memberId}::uuid AND deleted_at IS NULL`);
		},

		softDeleteAllInLedger: async (ledgerId, actorId) => {
			await db.execute(sql`
				UPDATE ledger_member SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE ledger_id = ${ledgerId}::uuid AND deleted_at IS NULL`);
		},

		displayNames: async (userIds) => {
			if (userIds.length === 0) return new Map();

			const rows = await db.execute<{ id: string; display_name: string }>(sql`
				SELECT id, display_name FROM app_user
				WHERE id IN ${idList(userIds)} AND deleted_at IS NULL`);

			return new Map(rows.map((row) => [row.id, row.display_name]));
		},
	};
}
