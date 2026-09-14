import type { Executor } from "@monevo/db";
import { newId } from "@monevo/db";
import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import type { PricedLine } from "../domain/pricer.ts";
import { idList } from "./sql.ts";

export interface EntryRow extends Record<string, unknown> {
	id: string;
	ledger_id: string | null;
	owner_user_id: string | null;
	kind: string;
	entry_date: string;
	description: string;
	memo: string | null;
	created_by_user_id: string;
	client_request_id: string;
	create_request_hash: string;
	created_at: string;
	updated_at: string;
	updated_by: string | null;
	version: string;
	deleted_at: string | null;
}

export interface LineRow extends Record<string, unknown> {
	id: string;
	entry_id: string;
	line_no: number;
	side: string;
	account_id: string;
	currency: string;
	amount_minor: string;
	fx_rate: string;
	base_amount_minor: string;
	fx_rate_source: string;
	fx_rate_as_of: string | null;
	memo: string | null;
}

export interface EntryFilter {
	ledgerId: string;
	from?: string;
	to?: string;
	accountIds: readonly string[];
	kinds: readonly string[];
	page: number;
	size: number;
}

const ENTRY_COLUMNS = sql`id, ledger_id, owner_user_id, kind, entry_date, description, memo,
	created_by_user_id, client_request_id, create_request_hash, created_at, updated_at,
	updated_by, version, deleted_at`;

const LINE_COLUMNS = sql`id, entry_id, line_no, side, account_id, currency, amount_minor,
	fx_rate, base_amount_minor, fx_rate_source, fx_rate_as_of, memo`;

export interface EntryRepository {
	findById(entryId: string): Promise<EntryRow | undefined>;
	findReplay(requesterId: string, clientRequestId: string): Promise<EntryRow | undefined>;
	linesOf(entryId: string): Promise<LineRow[]>;
	linesOfMany(entryIds: readonly string[]): Promise<LineRow[]>;
	search(filter: EntryFilter): Promise<{ items: EntryRow[]; totalElements: number }>;
	insert(entry: {
		ledgerId: string;
		kind: string;
		entryDate: string;
		description: string;
		memo: string | null;
		createdByUserId: string;
		clientRequestId: string;
		createRequestHash: string;
	}): Promise<EntryRow>;
	applyEdit(
		entryId: string,
		expectedVersion: number,
		changes: { entryDate: string; description: string; memo: string | null; kind: string },
		actorId: string,
	): Promise<EntryRow | undefined>;
	writeLines(entryId: string, lines: readonly PricedLine[], actorId: string): Promise<void>;
	softDeleteLines(entryId: string, actorId: string): Promise<void>;
	softDelete(entryId: string, actorId: string): Promise<void>;
}

export function createEntryRepository(db: Executor): EntryRepository {
	const one = async (query: SQL) => (await db.execute<EntryRow>(query))[0];

	function scope(filter: EntryFilter): SQL {
		const clauses: SQL[] = [
			sql`WHERE e.deleted_at IS NULL AND e.ledger_id = ${filter.ledgerId}::uuid`,
		];

		if (filter.from) clauses.push(sql`AND e.entry_date >= ${filter.from}::date`);
		if (filter.to) clauses.push(sql`AND e.entry_date <= ${filter.to}::date`);
		if (filter.kinds.length > 0) {
			clauses.push(
				sql`AND e.kind IN (${sql.join(
					filter.kinds.map((kind) => sql`${kind}`),
					sql`, `,
				)})`,
			);
		}
		if (filter.accountIds.length > 0) {
			clauses.push(sql`AND EXISTS (
				SELECT 1 FROM journal_line l
				WHERE l.entry_id = e.id AND l.deleted_at IS NULL
				AND l.account_id IN ${idList(filter.accountIds)})`);
		}

		return sql.join(clauses, sql` `);
	}

	return {
		findById: (entryId) =>
			one(sql`SELECT ${ENTRY_COLUMNS} FROM journal_entry
				WHERE id = ${entryId}::uuid AND deleted_at IS NULL`),

		findReplay: (requesterId, clientRequestId) =>
			one(sql`SELECT ${ENTRY_COLUMNS} FROM journal_entry
				WHERE created_by_user_id = ${requesterId}::uuid
				AND client_request_id = ${clientRequestId}::uuid`),

		linesOf: async (entryId) =>
			db.execute<LineRow>(sql`
				SELECT ${LINE_COLUMNS} FROM journal_line
				WHERE entry_id = ${entryId}::uuid AND deleted_at IS NULL ORDER BY line_no`),

		linesOfMany: async (entryIds) =>
			entryIds.length === 0
				? []
				: db.execute<LineRow>(sql`
					SELECT ${LINE_COLUMNS} FROM journal_line
					WHERE entry_id IN ${idList(entryIds)} AND deleted_at IS NULL
					ORDER BY entry_id, line_no`),

		search: async (filter) => {
			const where = scope(filter);

			const counted = await db.execute<{ n: string }>(sql`
				SELECT COUNT(*)::bigint AS n FROM journal_entry e ${where}`);

			const items = await db.execute<EntryRow>(sql`
				SELECT ${ENTRY_COLUMNS} FROM journal_entry e ${where}
				ORDER BY e.entry_date DESC, e.id DESC
				LIMIT ${filter.size} OFFSET ${filter.page * filter.size}`);

			return { items, totalElements: Number(counted[0]?.n ?? 0) };
		},

		insert: async (entry) => {
			const rows = await db.execute<EntryRow>(sql`
				INSERT INTO journal_entry (id, ledger_id, kind, entry_date, description, memo,
					created_by_user_id, client_request_id, create_request_hash, created_by, updated_by)
				VALUES (${newId()}::uuid, ${entry.ledgerId}::uuid, ${entry.kind},
					${entry.entryDate}::date, ${entry.description}, ${entry.memo},
					${entry.createdByUserId}::uuid, ${entry.clientRequestId}::uuid,
					${entry.createRequestHash}, ${entry.createdByUserId}::uuid,
					${entry.createdByUserId}::uuid)
				RETURNING ${ENTRY_COLUMNS}`);

			return rows[0]!;
		},

		applyEdit: async (entryId, expectedVersion, changes, actorId) =>
			one(sql`
				UPDATE journal_entry SET entry_date = ${changes.entryDate}::date,
					description = ${changes.description}, memo = ${changes.memo},
					kind = ${changes.kind}, version = version + 1, updated_by = ${actorId}::uuid
				WHERE id = ${entryId}::uuid AND deleted_at IS NULL AND version = ${expectedVersion}
				RETURNING ${ENTRY_COLUMNS}`),

		writeLines: async (entryId, lines, actorId) => {
			const values = lines.map(
				(line, index) => sql`(${newId()}::uuid, ${entryId}::uuid, ${index}, ${line.side},
					${line.accountId}::uuid, ${line.currency}, ${line.amountMinor.toString()}::bigint,
					${line.fxRate}::numeric, ${line.baseAmountMinor.toString()}::bigint,
					${line.source}, ${line.asOf ? sql`${line.asOf}::date` : sql`NULL`},
					${line.memo}, ${actorId}::uuid, ${actorId}::uuid)`,
			);

			await db.execute(sql`
				INSERT INTO journal_line (id, entry_id, line_no, side, account_id, currency,
					amount_minor, fx_rate, base_amount_minor, fx_rate_source, fx_rate_as_of, memo,
					created_by, updated_by)
				VALUES ${sql.join(values, sql`, `)}`);
		},

		softDeleteLines: async (entryId, actorId) => {
			await db.execute(sql`
				UPDATE journal_line SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE entry_id = ${entryId}::uuid AND deleted_at IS NULL`);
		},

		softDelete: async (entryId, actorId) => {
			await db.execute(sql`
				UPDATE journal_entry SET deleted_at = now(), deleted_by = ${actorId}::uuid
				WHERE id = ${entryId}::uuid AND deleted_at IS NULL`);
		},
	};
}
