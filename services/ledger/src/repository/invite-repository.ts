import type { Executor } from "@monevo/db";
import { newId } from "@monevo/db";
import { sql } from "drizzle-orm";

export interface InviteRow extends Record<string, unknown> {
	id: string;
	ledger_id: string;
	code: string;
	expires_at: string;
	revoked_at: string | null;
	max_uses: number;
	used_count: number;
	created_at: string;
}

export interface InviteRepository {
	findByCode(code: string): Promise<InviteRow | undefined>;
	findByIdInLedger(inviteId: string, ledgerId: string): Promise<InviteRow | undefined>;
	findByLedger(ledgerId: string): Promise<InviteRow[]>;
	existsByCode(code: string): Promise<boolean>;
	insert(input: {
		ledgerId: string;
		code: string;
		createdByUserId: string;
		expiresAt: Date;
		maxUses: number;
	}): Promise<InviteRow>;
	revoke(inviteId: string): Promise<void>;
	revokeAllUsable(ledgerId: string): Promise<void>;
	claim(inviteId: string): Promise<boolean>;
}

const COLUMNS = sql`id, ledger_id, code, expires_at, revoked_at, max_uses, used_count, created_at`;

export function createInviteRepository(db: Executor): InviteRepository {
	return {
		findByCode: async (code) => {
			const rows = await db.execute<InviteRow>(sql`
				SELECT ${COLUMNS} FROM ledger_invite WHERE code = ${code}`);

			return rows[0];
		},

		findByIdInLedger: async (inviteId, ledgerId) => {
			const rows = await db.execute<InviteRow>(sql`
				SELECT ${COLUMNS} FROM ledger_invite
				WHERE id = ${inviteId}::uuid AND ledger_id = ${ledgerId}::uuid`);

			return rows[0];
		},

		findByLedger: async (ledgerId) =>
			db.execute<InviteRow>(sql`
				SELECT ${COLUMNS} FROM ledger_invite
				WHERE ledger_id = ${ledgerId}::uuid ORDER BY created_at DESC`),

		existsByCode: async (code) => {
			const rows = await db.execute<{ ok: boolean }>(sql`
				SELECT EXISTS (SELECT 1 FROM ledger_invite WHERE code = ${code}) AS ok`);

			return rows[0]?.ok === true;
		},

		insert: async (input) => {
			const rows = await db.execute<InviteRow>(sql`
				INSERT INTO ledger_invite (id, ledger_id, code, created_by_user_id, expires_at, max_uses)
				VALUES (${newId()}::uuid, ${input.ledgerId}::uuid, ${input.code},
					${input.createdByUserId}::uuid, ${input.expiresAt.toISOString()}::timestamptz,
					${input.maxUses})
				RETURNING ${COLUMNS}`);

			return rows[0]!;
		},

		revoke: async (inviteId) => {
			await db.execute(sql`
				UPDATE ledger_invite SET revoked_at = now()
				WHERE id = ${inviteId}::uuid AND revoked_at IS NULL`);
		},

		revokeAllUsable: async (ledgerId) => {
			await db.execute(sql`
				UPDATE ledger_invite SET revoked_at = now()
				WHERE ledger_id = ${ledgerId}::uuid AND revoked_at IS NULL
				AND expires_at > now() AND used_count < max_uses`);
		},

		claim: async (inviteId) => {
			const rows = await db.execute<{ id: string }>(sql`
				UPDATE ledger_invite SET used_count = used_count + 1
				WHERE id = ${inviteId}::uuid AND revoked_at IS NULL
				AND expires_at > now() AND used_count < max_uses
				RETURNING id`);

			return rows.length === 1;
		},
	};
}
