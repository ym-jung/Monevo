package com.monevo.account.service;

import com.monevo.account.dto.AccountBalanceResponse;
import com.monevo.account.dto.AccountCreateRequest;
import com.monevo.account.dto.AccountDetail;
import com.monevo.account.dto.AccountUpdateRequest;
import com.monevo.account.entity.Account;
import com.monevo.account.entity.AccountBalance;
import com.monevo.account.entity.LedgerAccount;
import com.monevo.account.repository.AccountBalanceRepository;
import com.monevo.account.repository.AccountRepository;
import com.monevo.account.repository.LedgerAccountRepository;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.common.error.types.ForbiddenException;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.journal.service.JournalLineQueryService;
import com.monevo.journal.service.OpeningBalanceService;
import com.monevo.ledger.service.LedgerAccessChecker;
import com.monevo.meta.service.CurrencyService;
import com.monevo.user.service.AppUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AccountService {
	private final AccountRepository accountRepository;
	private final AccountBalanceRepository accountBalanceRepository;
	private final AppUserService appUserService;
	private final LedgerAccessChecker ledgerAccessChecker;
	private final AccountAccessChecker accountAccessChecker;
	private final CurrencyService currencyService;
	private final LedgerAccountRepository ledgerAccountRepository;
	private final CategoryService categoryService;
	private final JournalLineQueryService journalLineQueryService;
	private final OpeningBalanceService openingBalanceService;

	@Transactional(readOnly = true)
	public Account requireUsableAccount(UUID accountId, UUID ledgerId, UUID requesterId) {
		return accountAccessChecker.requireUsableAccount(accountId, ledgerId, requesterId);
	}

	@Transactional(readOnly = true)
	public Map<UUID, Account> accountsByIds(Collection<UUID> accountIds) {
		if (accountIds == null || accountIds.isEmpty()) {
			return Map.of();
		}
		return accountRepository.findAllById(accountIds).stream()
			.filter(account -> !account.isDeleted())
			.collect(Collectors.toMap(Account::getId, account -> account));
	}

	@Transactional(readOnly = true)
	public Map<UUID, Account> accountsWithParents(Collection<UUID> accountIds) {
		Map<UUID, Account> found = accountsByIds(accountIds);

		List<UUID> parentIds = found.values().stream()
			.map(Account::getParentId)
			.filter(Objects::nonNull)
			.filter(id -> !found.containsKey(id))
			.distinct()
			.toList();
		if (parentIds.isEmpty()) {
			return found;
		}

		Map<UUID, Account> merged = new HashMap<>(found);
		merged.putAll(accountsByIds(parentIds));
		return merged;
	}

	@Transactional(readOnly = true)
	public List<AccountDetail> getAccounts(UUID ledgerId, boolean includeArchived, UUID requesterId) {
		List<Account> accountList;
		if (ledgerId == null) {
			accountList = accountRepository
				.findByOwnerUserIdAndSubtypeAndDeletedAtIsNullOrderBySortOrderAscNameAsc(requesterId, Account.Subtype.REAL);
		} else {
			ledgerAccessChecker.requireMember(ledgerId, requesterId);
			accountList = accountRepository.findRealLinkedToLedger(ledgerId);
		}

		if (!includeArchived) {
			accountList = accountList.stream().filter(account -> !account.isArchived()).toList();
		}

		if (accountList.isEmpty()) {
			return Collections.emptyList();
		}

		List<UUID> accountIds = accountList.stream().map(Account::getId).toList();

		Map<UUID, AccountBalance> balanceMap = accountBalanceRepository.findByAccountIdIn(accountIds)
			.stream().collect(Collectors.toMap(AccountBalance::getAccountId, accountBalance -> accountBalance));

		Map<UUID, List<UUID>> linkMap = ledgerIdsByAccount(accountIds);

		Map<UUID, String> ownerNameMap = appUserService.displayNamesByIds(
			accountList.stream().map(Account::getOwnerUserId).distinct().toList());

		List<AccountDetail> res = new ArrayList<>();

		for (Account account : accountList) {
			res.add(AccountDetail.from(account, balanceMap.get(account.getId()),
				ownerNameMap.get(account.getOwnerUserId()),
				linkMap.getOrDefault(account.getId(), List.of())));
		}

		return res;
	}

	@Transactional(readOnly = true)
	public AccountDetail getAccount(UUID accountId, UUID requesterId) {
		Account account = requireVisibleAccount(accountId, requesterId);

		String ownerDisplayName = appUserService.displayNameOf(account.getOwnerUserId());

		AccountBalance balance = accountBalanceRepository.findByAccountId(account.getId()).orElse(null);

		return AccountDetail.from(account, balance, ownerDisplayName,
			ledgerIdsByAccount(List.of(accountId)).getOrDefault(accountId, List.of()));
	}

	@Transactional(readOnly = true)
	public AccountBalanceResponse getBalance(UUID accountId, UUID requesterId) {
		AccountDetail accountDetail = getAccount(accountId, requesterId);

		return new AccountBalanceResponse(accountDetail.id(), accountDetail.currency(), accountDetail.balanceMinor());
	}

	@Transactional
	public AccountDetail createAccount(AccountCreateRequest request, UUID ownerId) {
		currencyService.require(request.currency());

		request.ledgerIds().forEach(ledgerId -> accountAccessChecker.requireShareTarget(ledgerId, ownerId));

		long sortOrder = accountRepository
			.countByOwnerUserIdAndSubtypeAndDeletedAtIsNull(ownerId, Account.Subtype.REAL) * 10;

		String ownerDisplayName = appUserService.displayNameOf(ownerId);

		Account saved = accountRepository.saveAndFlush(Account.real(ownerId,
			request.name(),
			request.type(),
			request.currency(),
			request.memo(),
			(short) sortOrder
		));
		ledgerAccountRepository.saveAll(request.ledgerIds().stream()
			.map(ledgerId -> LedgerAccount.create(ledgerId, saved.getId()))
			.toList());

		openingBalanceService.record(saved, request.openingBalanceMinor());

		AccountBalance balance = accountBalanceRepository.findByAccountId(saved.getId()).orElse(null);

		return AccountDetail.from(saved, balance, ownerDisplayName, List.copyOf(request.ledgerIds()));
	}

	@Transactional
	public AccountDetail updateAccount(UUID accountId, AccountUpdateRequest request, UUID requesterId) {
		Account target = requireOwnedAccount(accountId, requesterId);

		if (!request.version().equals(target.getVersion())) {
			log.info("Stale account {} update by {}: sent version {}, current {}", accountId, requesterId, request.version(), target.getVersion());
			throw new ConflictException(ErrorCode.CONCURRENT_MODIFICATION, "Account " + accountId + " was modified by someone else");
		}

		if (request.name() != null) {
			target.rename(request.name());
		}

		if (request.memo() != null) {
			target.changeMemo(request.memo());
		}

		if (request.archived() != null) {
			if (request.archived()) {
				target.archive(Instant.now());
			} else {
				target.unarchive();
			}
		}

		accountRepository.saveAndFlush(target);

		AccountBalance balance = accountBalanceRepository.findByAccountId(target.getId()).orElse(null);

		String ownerDisplayName = appUserService.displayNameOf(target.getOwnerUserId());

		return AccountDetail.from(target, balance, ownerDisplayName,
			ledgerIdsByAccount(List.of(accountId)).getOrDefault(accountId, List.of()));
	}

	@Transactional
	public void deleteAccount(UUID accountId, UUID requesterId) {
		Account target = requireOwnedAccount(accountId, requesterId);

		if (journalLineQueryService.hasNonOpeningLine(accountId)) {
			log.info("Account {} has journal lines.", accountId);
			throw new ConflictException(ErrorCode.ACCOUNT_HAS_TRANSACTIONS, "This account has transaction logs.");
		}

		Instant now = Instant.now();
		openingBalanceService.discard(accountId, requesterId);
		ledgerAccountRepository.findByAccountIdAndDeletedAtIsNull(accountId)
			.forEach(link -> link.softDelete(requesterId, now));
		target.softDelete(requesterId, now);
	}

	@Transactional
	public void linkAccount(UUID accountId, UUID ledgerId, UUID requesterId) {
		Account account = requireOwnedAccount(accountId, requesterId);
		if (account.isArchived()) {
			throw new ConflictException(ErrorCode.ACCOUNT_ARCHIVED,
				"Archived accounts cannot be linked for new use.");
		}
		accountAccessChecker.requireShareTarget(ledgerId, requesterId);

		if (!ledgerAccountRepository.existsByLedgerIdAndAccountIdAndDeletedAtIsNull(ledgerId, accountId)) {
			ledgerAccountRepository.save(LedgerAccount.create(ledgerId, accountId));
		}
	}

	@Transactional
	public void unlinkAccount(UUID accountId, UUID ledgerId, UUID requesterId) {
		requireOwnedAccount(accountId, requesterId);
		ledgerAccountRepository.findByLedgerIdAndAccountIdAndDeletedAtIsNull(ledgerId, accountId)
			.ifPresent(link -> link.softDelete(requesterId, Instant.now()));
	}

	private Map<UUID, List<UUID>> ledgerIdsByAccount(Collection<UUID> accountIds) {
		Map<UUID, List<UUID>> result = new HashMap<>();
		for (LedgerAccount link : ledgerAccountRepository.findByAccountIdInAndDeletedAtIsNull(accountIds)) {
			result.computeIfAbsent(link.getAccountId(), key -> new ArrayList<>()).add(link.getLedgerId());
		}
		return result;
	}

	private Account requireVisibleAccount(UUID accountId, UUID requesterId) {
		Account account = requireRealAccount(accountId, requesterId);
		if (account.isOwnedBy(requesterId) || sharesALedgerWith(accountId, requesterId)) {
			return account;
		}
		log.info("No access permission to {}, requested by {}", accountId, requesterId);
		throw new ForbiddenException(ErrorCode.ACCOUNT_NOT_ACCESSIBLE,
			"You don't have any permission to access this account.");
	}

	private boolean sharesALedgerWith(UUID accountId, UUID requesterId) {
		Set<UUID> accessibleLedgerIds = ledgerAccessChecker.accessibleLedgerIds(requesterId);
		return !accessibleLedgerIds.isEmpty()
			&& ledgerAccountRepository.existsByAccountIdAndLedgerIdInAndDeletedAtIsNull(accountId, accessibleLedgerIds);
	}

	private Account requireRealAccount(UUID accountId, UUID requesterId) {
		return accountRepository.findByIdAndSubtypeAndDeletedAtIsNull(accountId, Account.Subtype.REAL)
			.orElseThrow(() -> {
				log.info("Account {} was not found, requested by {}", accountId, requesterId);
				return new NotFoundException(ErrorCode.ACCOUNT_NOT_FOUND, "Account was not found.");
			});
	}

	private Account requireOwnedAccount(UUID accountId, UUID requesterId) {
		Account account = requireRealAccount(accountId, requesterId);
		if (!account.isOwnedBy(requesterId)) {
			log.info("User {} does not have any permissions to edit this account {}", requesterId, accountId);
			throw new ForbiddenException(ErrorCode.ACCOUNT_NOT_ACCESSIBLE,
				"You do not have permission to edit this account.");
		}
		return account;
	}
}
