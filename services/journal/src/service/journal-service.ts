import type {
	JournalEntryCreateRequest,
	JournalEntryDetail,
	JournalEntrySummary,
	JournalEntryUpdateRequest,
	JournalLineInput,
} from "@monevo/contracts";
import { newId } from "@monevo/db";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@monevo/http";
import type { PageResponse } from "@monevo/http";
import { page } from "@monevo/http";

import { fingerprint } from "../domain/fingerprint.ts";
import type { LineRequest, PricedLine, PricingContext } from "../domain/pricer.ts";
import { price } from "../domain/pricer.ts";
import { toDetail, toSummary } from "../domain/projector.ts";
import type { UsableAccount } from "../domain/shape.ts";
import {
	deriveKind,
	moneySideCurrency,
	requireBalanced,
	resolveCurrency,
	validateShape,
} from "../domain/shape.ts";
import type { EntryRow, EntryRepository } from "../repository/entry-repository.ts";
import type { FxRepository } from "../repository/fx-repository.ts";
import type { ScopeRepository } from "../repository/scope-repository.ts";

const MAX_FILTER_IDS = 50;

export interface Repositories {
	entries: EntryRepository;
	scopes: ScopeRepository;
	fx: FxRepository;
}

export type RunInTransaction = <T>(run: (repositories: Repositories) => Promise<T>) => Promise<T>;

export interface EntryQuery {
	ledgerId: string;
	from?: string;
	to?: string;
	accountIds: string[];
	categoryIds: string[];
	kinds: string[];
	page: number;
	size: number;
}

export interface JournalService {
	create(request: JournalEntryCreateRequest, requesterId: string): Promise<JournalEntryDetail>;
	update(
		entryId: string,
		request: JournalEntryUpdateRequest,
		requesterId: string,
	): Promise<JournalEntryDetail>;
	get(entryId: string, requesterId: string): Promise<JournalEntryDetail>;
	search(query: EntryQuery, requesterId: string): Promise<PageResponse<JournalEntrySummary>>;
	remove(entryId: string, requesterId: string): Promise<void>;
}

export function createJournalService(
	entries: EntryRepository,
	scopes: ScopeRepository,
	fx: FxRepository,
	runInTransaction: RunInTransaction,
): JournalService {
	async function resolveAccounts(
		lines: readonly JournalLineInput[],
		ledgerId: string,
	): Promise<Map<string, UsableAccount>> {
		const ids = [...new Set(lines.map((line) => line.accountId))];
		const found = await scopes.accountsByIds(ids);

		for (const id of ids) {
			const account = found.get(id);
			if (!account) throw new NotFoundError("ACCOUNT_NOT_FOUND");

			if (account.subtype === "SYSTEM") {
				throw new ValidationError("JOURNAL_LINE_ACCOUNT_INVALID");
			}

			if (account.subtype === "CATEGORY") {
				if (account.ledgerId !== ledgerId) throw new ValidationError("CATEGORY_LEDGER_MISMATCH");
				if (await scopes.hasChildren(id)) throw new ValidationError("CATEGORY_NOT_LEAF");
				continue;
			}

			if (!(await scopes.isLinkedToLedger(id, ledgerId))) {
				throw new ForbiddenError("ACCOUNT_NOT_ACCESSIBLE");
			}
			if (account.archivedAt !== null) throw new ConflictError("ACCOUNT_ARCHIVED");
		}

		return found;
	}

	async function priceLines(
		lines: readonly JournalLineInput[],
		accounts: Map<string, UsableAccount>,
		baseCurrency: string,
		entryDate: string,
	): Promise<PricedLine[]> {
		const fallbackCurrency = moneySideCurrency(lines, accounts, baseCurrency);
		const exponents = await scopes.exponents();

		const requests: LineRequest[] = lines.map((line) => ({
			side: line.side,
			accountId: line.accountId,
			currency: resolveCurrency(line, accounts.get(line.accountId)!, fallbackCurrency),
			amountMinor: line.amountMinor,
			requestedRate: line.fxRate ?? null,
			memo: line.memo ?? null,
		}));

		const needed = [
			...new Set(
				requests
					.filter((request) => request.currency !== baseCurrency && request.requestedRate === null)
					.map((request) => request.currency),
			),
		];

		const quotes = new Map<string, { rate: string; asOf: string }>();
		for (const currency of needed) {
			const quote = await fx.resolve(baseCurrency, currency, entryDate);
			if (quote) quotes.set(currency, quote);
		}

		const context: PricingContext = {
			baseCurrency,
			exponentOf: (currency) => {
				const exponent = exponents.get(currency);
				if (exponent === undefined) throw new ValidationError("CURRENCY_NOT_SUPPORTED");

				return exponent;
			},
			quoteFor: (currency) => quotes.get(currency),
		};

		const priced = price(requests, context);
		requireBalanced(priced);

		return priced;
	}

	async function detailOf(entry: EntryRow): Promise<JournalEntryDetail> {
		const lines = await entries.linesOf(entry.id);
		const accounts = await scopes.accountsWithParents(lines.map((line) => line.account_id));
		const names = await scopes.displayNames([entry.created_by_user_id, entry.updated_by ?? ""]);

		const baseCurrency = entry.ledger_id
			? await scopes.baseCurrencyOf(entry.ledger_id)
			: (lines[0]?.currency.trim() ?? null);

		return toDetail(entry, lines, accounts, names, baseCurrency);
	}

	async function requireEntry(entryId: string): Promise<EntryRow> {
		const entry = await entries.findById(entryId);
		if (!entry) throw new NotFoundError("JOURNAL_ENTRY_NOT_FOUND");

		return entry;
	}

	async function requireAccess(entry: EntryRow, requesterId: string): Promise<void> {
		if (entry.ledger_id) {
			await scopes.requireLedgerMember(entry.ledger_id, requesterId);
			return;
		}

		if (entry.owner_user_id !== requesterId) {
			throw new ForbiddenError("ACCOUNT_NOT_ACCESSIBLE");
		}
	}

	function requireSameRequest(entry: EntryRow, requestHash: string): EntryRow {
		if (entry.create_request_hash !== requestHash || entry.deleted_at !== null) {
			throw new ConflictError("TRANSACTION_IDEMPOTENCY_KEY_REUSED");
		}

		return entry;
	}

	return {
		create: async (request, requesterId) => {
			await scopes.requireLedgerMember(request.ledgerId, requesterId);

			const clientRequestId = request.clientRequestId ?? newId();
			const requestHash = fingerprint(request);

			const replay = await entries.findReplay(requesterId, clientRequestId);
			if (replay) return detailOf(requireSameRequest(replay, requestHash));

			validateShape(request.lines);
			const accounts = await resolveAccounts(request.lines, request.ledgerId);
			const baseCurrency = await scopes.baseCurrencyOf(request.ledgerId);
			const priced = await priceLines(request.lines, accounts, baseCurrency, request.entryDate);
			const kind = deriveKind(request.lines, accounts);

			const entry = await runInTransaction(async (tx) => {
				const created = await tx.entries.insert({
					ledgerId: request.ledgerId,
					kind,
					entryDate: request.entryDate,
					description: request.description,
					memo: request.memo ?? null,
					createdByUserId: requesterId,
					clientRequestId,
					createRequestHash: requestHash,
				});

				await tx.entries.writeLines(created.id, priced, requesterId);

				return created;
			});

			return detailOf(entry);
		},

		update: async (entryId, request, requesterId) => {
			const entry = await requireEntry(entryId);
			await requireAccess(entry, requesterId);

			const entryDate = request.entryDate ?? String(entry.entry_date).slice(0, 10);
			const description = request.description ?? entry.description;
			const memo = request.memo ?? entry.memo;

			const baseCurrency = entry.ledger_id
				? await scopes.baseCurrencyOf(entry.ledger_id)
				: null;

			let priced: PricedLine[] | null = null;
			let kind = entry.kind;

			const ratesMayHaveMoved = entryDate !== String(entry.entry_date).slice(0, 10);
			if (request.lines || ratesMayHaveMoved) {
				const lines = request.lines ?? (await currentLinesAsInput(entryId));
				validateShape(lines);

				const accounts = await resolveAccounts(lines, entry.ledger_id!);
				priced = await priceLines(lines, accounts, baseCurrency!, entryDate);
				if (entry.kind !== "OPENING") kind = deriveKind(lines, accounts);
			}

			const updated = await runInTransaction(async (tx) => {
				const applied = await tx.entries.applyEdit(
					entryId,
					request.version,
					{ entryDate, description, memo, kind },
					requesterId,
				);
				if (!applied) throw new ConflictError("CONCURRENT_MODIFICATION");

				if (priced) {
					await tx.entries.softDeleteLines(entryId, requesterId);
					await tx.entries.writeLines(entryId, priced, requesterId);
				}

				return applied;
			});

			return detailOf(updated);
		},

		get: async (entryId, requesterId) => {
			const entry = await requireEntry(entryId);
			await requireAccess(entry, requesterId);

			return detailOf(entry);
		},

		search: async (query, requesterId) => {
			await scopes.requireLedgerMember(query.ledgerId, requesterId);

			for (const [field, ids] of [
				["accountId", query.accountIds],
				["categoryId", query.categoryIds],
			] as const) {
				if (ids.length > MAX_FILTER_IDS) {
					throw new ValidationError("VALIDATION_FAILED", [
						{ field, issue: "Size", value: String(ids.length) },
					]);
				}
			}

			await scopes.requireUsableAccounts(query.accountIds, query.ledgerId);

			const targets = [
				...new Set([
					...query.accountIds,
					...(await scopes.selfAndChildIds(query.categoryIds, query.ledgerId)),
				]),
			];

			const { items, totalElements } = await entries.search({
				ledgerId: query.ledgerId,
				...(query.from ? { from: query.from } : {}),
				...(query.to ? { to: query.to } : {}),
				accountIds: targets,
				kinds: query.kinds,
				page: query.page,
				size: query.size,
			});

			const lines = await entries.linesOfMany(items.map((item) => item.id));
			const accounts = await scopes.accountsWithParents(lines.map((line) => line.account_id));

			const byEntry = new Map<string, typeof lines>();
			for (const line of lines) {
				const group = byEntry.get(line.entry_id) ?? [];
				group.push(line);
				byEntry.set(line.entry_id, group);
			}

			return page(
				items.map((item) => toSummary(item, byEntry.get(item.id) ?? [], accounts)),
				query.page,
				query.size,
				totalElements,
			);
		},

		remove: async (entryId, requesterId) => {
			const entry = await requireEntry(entryId);
			await requireAccess(entry, requesterId);

			await runInTransaction(async (tx) => {
				await tx.entries.softDeleteLines(entryId, requesterId);
				await tx.entries.softDelete(entryId, requesterId);
			});
		},
	};

	async function currentLinesAsInput(entryId: string): Promise<JournalLineInput[]> {
		return (await entries.linesOf(entryId)).map((line) => ({
			side: line.side as "DEBIT" | "CREDIT",
			accountId: line.account_id,
			amountMinor: Number(line.amount_minor),
			currency: line.currency.trim(),
			fxRate: null,
			memo: line.memo,
		}));
	}
}
