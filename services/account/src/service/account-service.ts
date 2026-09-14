import type {
	AccountBalanceResponse,
	AccountCreateRequest,
	AccountDetail,
	AccountUpdateRequest,
} from "@monevo/contracts";
import { ConflictError, ValidationError } from "@monevo/http";

import { SORT_STEP, openingMarker, toDetail } from "../domain/account.ts";
import type { AccountRepository } from "../repository/account-repository.ts";
import type { ScopeRepository } from "../repository/scope-repository.ts";
import type { AccessChecker } from "./access-checker.ts";

export interface Repositories {
	accounts: AccountRepository;
	scopes: ScopeRepository;
}

export type RunInTransaction = <T>(run: (repositories: Repositories) => Promise<T>) => Promise<T>;

export interface AccountService {
	list(ledgerId: string | undefined, includeArchived: boolean, requesterId: string): Promise<AccountDetail[]>;
	get(accountId: string, requesterId: string): Promise<AccountDetail>;
	balance(accountId: string, requesterId: string): Promise<AccountBalanceResponse>;
	create(request: AccountCreateRequest, ownerId: string): Promise<AccountDetail>;
	update(accountId: string, request: AccountUpdateRequest, requesterId: string): Promise<AccountDetail>;
	remove(accountId: string, requesterId: string): Promise<void>;
	link(accountId: string, ledgerId: string, requesterId: string): Promise<void>;
	unlink(accountId: string, ledgerId: string, requesterId: string): Promise<void>;
}

export function createAccountService(
	accounts: AccountRepository,
	scopes: ScopeRepository,
	access: AccessChecker,
	runInTransaction: RunInTransaction,
): AccountService {
	async function detailOf(accountId: string, requesterId: string): Promise<AccountDetail> {
		const account = await access.requireVisibleAccount(accountId, requesterId);

		const [balances, links, names] = await Promise.all([
			accounts.balances([accountId]),
			scopes.linkedLedgerIds([accountId]),
			scopes.displayNames(account.owner_user_id ? [account.owner_user_id] : []),
		]);

		return toDetail(
			account,
			balances.get(accountId) ?? 0n,
			account.owner_user_id ? (names.get(account.owner_user_id) ?? null) : null,
			links.get(accountId) ?? [],
		);
	}

	return {
		list: async (ledgerId, includeArchived, requesterId) => {
			let rows;
			if (ledgerId === undefined) {
				rows = await accounts.findRealOwnedBy(requesterId);
			} else {
				await access.requireLedgerMember(ledgerId, requesterId);
				rows = await accounts.findRealLinkedToLedger(ledgerId);
			}

			if (!includeArchived) rows = rows.filter((row) => row.archived_at === null);
			if (rows.length === 0) return [];

			const accountIds = rows.map((row) => row.id);
			const ownerIds = [
				...new Set(rows.map((row) => row.owner_user_id).filter((id): id is string => id !== null)),
			];

			const [balances, links, names] = await Promise.all([
				accounts.balances(accountIds),
				scopes.linkedLedgerIds(accountIds),
				scopes.displayNames(ownerIds),
			]);

			return rows.map((row) =>
				toDetail(
					row,
					balances.get(row.id) ?? 0n,
					row.owner_user_id ? (names.get(row.owner_user_id) ?? null) : null,
					links.get(row.id) ?? [],
				),
			);
		},

		get: detailOf,

		balance: async (accountId, requesterId) => {
			const detail = await detailOf(accountId, requesterId);

			return {
				accountId: detail.id,
				currency: detail.currency,
				balanceMinor: detail.balanceMinor,
			};
		},

		create: async (request, ownerId) => {
			if (!(await scopes.currencyExists(request.currency))) {
				throw new ValidationError("CURRENCY_NOT_SUPPORTED", [
					{ field: "currency", issue: "Pattern", value: request.currency },
				]);
			}

			for (const ledgerId of request.ledgerIds) {
				await access.requireShareTarget(ledgerId, ownerId);
			}

			const sortOrder = (await accounts.countRealOwnedBy(ownerId)) * SORT_STEP;

			const created = await runInTransaction(async (tx) => {
				const account = await tx.accounts.insertReal({
					ownerUserId: ownerId,
					name: request.name,
					type: request.type,
					currency: request.currency,
					memo: request.memo ?? null,
					sortOrder,
				});

				for (const ledgerId of request.ledgerIds) {
					await tx.scopes.link(ledgerId, account.id, ownerId);
				}

				if (request.openingBalanceMinor !== 0) {
					const marker = openingMarker(account.id);
					if (await tx.scopes.openingEntryExists(marker)) {
						throw new ConflictError("OPENING_BALANCE_ALREADY_SET");
					}

					const equity = await tx.accounts.findOrCreateEquity(ownerId);

					await tx.scopes.recordOpeningBalance({
						marker,
						ownerUserId: ownerId,
						accountId: account.id,
						equityAccountId: equity.id,
						currency: request.currency,
						amountMinor: BigInt(Math.abs(request.openingBalanceMinor)),
						positive: request.openingBalanceMinor > 0,
					});
				}

				return account;
			});

			const [balances, names] = await Promise.all([
				accounts.balances([created.id]),
				scopes.displayNames([ownerId]),
			]);

			return toDetail(
				created,
				balances.get(created.id) ?? 0n,
				names.get(ownerId) ?? null,
				request.ledgerIds,
			);
		},

		update: async (accountId, request, requesterId) => {
			await access.requireOwnedAccount(accountId, requesterId);

			const changes: { name?: string; memo?: string | null; archived?: boolean } = {};
			if (request.name !== null && request.name !== undefined) changes.name = request.name;
			if (request.memo !== null && request.memo !== undefined) changes.memo = request.memo;
			if (request.archived !== null && request.archived !== undefined) {
				changes.archived = request.archived;
			}

			const updated = await accounts.update(accountId, changes, request.version, requesterId);
			if (!updated) throw new ConflictError("CONCURRENT_MODIFICATION");

			const [balances, links, names] = await Promise.all([
				accounts.balances([accountId]),
				scopes.linkedLedgerIds([accountId]),
				scopes.displayNames([requesterId]),
			]);

			return toDetail(
				updated,
				balances.get(accountId) ?? 0n,
				names.get(requesterId) ?? null,
				links.get(accountId) ?? [],
			);
		},

		remove: async (accountId, requesterId) => {
			await access.requireOwnedAccount(accountId, requesterId);

			if (await scopes.hasNonOpeningLine(accountId)) {
				throw new ConflictError("ACCOUNT_HAS_TRANSACTIONS");
			}

			await runInTransaction(async (tx) => {
				await tx.scopes.discardOpeningBalance(openingMarker(accountId), requesterId);
				await tx.scopes.unlinkAllForAccount(accountId, requesterId);
				await tx.accounts.softDelete(accountId, requesterId);
			});
		},

		link: async (accountId, ledgerId, requesterId) => {
			const account = await access.requireOwnedAccount(accountId, requesterId);
			if (account.archived_at !== null) throw new ConflictError("ACCOUNT_ARCHIVED");

			await access.requireShareTarget(ledgerId, requesterId);

			if (!(await scopes.isLinked(ledgerId, accountId))) {
				await scopes.link(ledgerId, accountId, requesterId);
			}
		},

		unlink: async (accountId, ledgerId, requesterId) => {
			await access.requireOwnedAccount(accountId, requesterId);
			await scopes.unlink(ledgerId, accountId, requesterId);
		},
	};
}
