import type { Executor } from "@monevo/db";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { idList } from "./sql.ts";

export interface UserRow extends Record<string, unknown> {
	id: string;
	cognito_sub: string;
	email: string;
	display_name: string;
	role: "USER" | "ADMIN";
	status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED" | "DELETED";
	display_currency: string;
	locale: string;
	timezone: string;
	created_at: string;
	approved_by_user_id: string | null;
	reject_reason: string | null;
}

const COLUMNS = sql`id, cognito_sub, email, display_name, role, status, display_currency,
	locale, timezone, created_at, approved_by_user_id, reject_reason`;

export interface ProfileChanges {
	email?: string;
	displayName?: string;
	displayCurrency?: string;
	locale?: string;
	timezone?: string;
}

export interface UserRepository {
	findById(userId: string): Promise<UserRow | undefined>;
	updateProfile(userId: string, changes: ProfileChanges): Promise<UserRow | undefined>;
	list(filter: { status?: string; page: number; size: number }): Promise<{
		items: UserRow[];
		totalElements: number;
	}>;
	setStatus(
		userId: string,
		status: string,
		fields: { approvedByUserId?: string; rejectReason?: string | null },
	): Promise<UserRow | undefined>;
	ownedLedgerIds(userId: string): Promise<string[]>;
	leaveEveryLedger(userId: string, actorId: string): Promise<void>;
}

export function createUserRepository(db: Executor): UserRepository {
	return {
		findById: async (userId) => {
			const rows = await db.execute<UserRow>(sql`
				SELECT ${COLUMNS} FROM app_user WHERE id = ${userId}::uuid AND deleted_at IS NULL`);

			return rows[0];
		},

		updateProfile: async (userId, changes) => {
			const sets: SQL[] = [sql`updated_by = ${userId}::uuid`];
			if (changes.email !== undefined) {
				sets.push(sql`email = ${changes.email}`);
				sets.push(sql`email_normalized = ${changes.email.trim().toLowerCase()}`);
			}
			if (changes.displayName !== undefined) sets.push(sql`display_name = ${changes.displayName}`);
			if (changes.displayCurrency !== undefined) {
				sets.push(sql`display_currency = ${changes.displayCurrency}`);
			}
			if (changes.locale !== undefined) sets.push(sql`locale = ${changes.locale}`);
			if (changes.timezone !== undefined) sets.push(sql`timezone = ${changes.timezone}`);

			const rows = await db.execute<UserRow>(sql`
				UPDATE app_user SET ${sql.join(sets, sql`, `)}, version = version + 1
				WHERE id = ${userId}::uuid AND deleted_at IS NULL
				RETURNING ${COLUMNS}`);

			return rows[0];
		},

		list: async (filter) => {
			const where = filter.status
				? sql`WHERE status = ${filter.status} AND deleted_at IS NULL`
				: sql``;

			const counted = await db.execute<{ n: string }>(sql`
				SELECT COUNT(*)::bigint AS n FROM app_user ${where}`);

			const items = await db.execute<UserRow>(sql`
				SELECT ${COLUMNS} FROM app_user ${where}
				ORDER BY created_at DESC, id DESC
				LIMIT ${filter.size} OFFSET ${filter.page * filter.size}`);

			return { items, totalElements: Number(counted[0]?.n ?? 0) };
		},

		setStatus: async (userId, status, fields) => {
			const sets: SQL[] = [sql`status = ${status}`];
			if (fields.approvedByUserId !== undefined) {
				sets.push(sql`approved_by_user_id = ${fields.approvedByUserId}::uuid`);
				sets.push(sql`updated_by = ${fields.approvedByUserId}::uuid`);
			}
			if (fields.rejectReason !== undefined) {
				sets.push(
					fields.rejectReason === null
						? sql`reject_reason = NULL`
						: sql`reject_reason = ${fields.rejectReason}`,
				);
			}

			const rows = await db.execute<UserRow>(sql`
				UPDATE app_user SET ${sql.join(sets, sql`, `)}, version = version + 1
				WHERE id = ${userId}::uuid AND deleted_at IS NULL
				RETURNING ${COLUMNS}`);

			return rows[0];
		},

		ownedLedgerIds: async (userId) => {
			const rows = await db.execute<{ ledger_id: string }>(sql`
				SELECT ledger_id FROM ledger_member
				WHERE user_id = ${userId}::uuid AND role = 'OWNER' AND deleted_at IS NULL`);

			return rows.map((row) => row.ledger_id);
		},

		leaveEveryLedger: async (userId, actorId) => {
			await db.execute(sql`
				UPDATE ledger_account la SET deleted_at = now(), deleted_by = ${actorId}::uuid
				FROM account a, ledger_member m
				WHERE la.account_id = a.id AND la.ledger_id = m.ledger_id
				AND m.user_id = ${userId}::uuid AND m.deleted_at IS NULL
				AND a.owner_user_id = ${userId}::uuid AND la.deleted_at IS NULL`);

			await db.execute(sql`
				UPDATE ledger_member SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE user_id = ${userId}::uuid AND deleted_at IS NULL`);
		},
	};
}

export { idList };
