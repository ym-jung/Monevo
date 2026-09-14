package com.monevo.account.service;

import com.monevo.account.entity.Account;
import com.monevo.account.repository.AccountRepository;
import com.monevo.account.repository.LedgerAccountRepository;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ForbiddenException;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.ledger.service.LedgerAccessChecker;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AccountAccessChecker {

	private final LedgerAccessChecker ledgerAccessChecker;
	private final AccountRepository accountRepository;
	private final LedgerAccountRepository ledgerAccountRepository;

	@Transactional(readOnly = true)
	public Account requireUsableAccount(UUID accountId, UUID ledgerId, UUID actorId) {
		ledgerAccessChecker.requireMember(ledgerId, actorId);

		Account account = accountRepository.findByIdAndDeletedAtIsNull(accountId)
			.orElseThrow(() -> new NotFoundException(ErrorCode.ACCOUNT_NOT_FOUND,
				"account not found: " + accountId));

		if (!ledgerAccountRepository.existsByLedgerIdAndAccountIdAndDeletedAtIsNull(ledgerId, accountId)) {
			throw new ForbiddenException(ErrorCode.ACCOUNT_NOT_ACCESSIBLE,
				"account " + accountId + " is not accessible in ledger " + ledgerId);
		}
		return account;
	}

	@Transactional(readOnly = true)
	public void requireUsableAccounts(Collection<UUID> accountIds, UUID ledgerId) {
		if (accountIds == null || accountIds.isEmpty()) {
			return;
		}
		Set<UUID> uniqueIds = Set.copyOf(accountIds);
		if (ledgerAccountRepository.countByLedgerIdAndAccountIdInAndDeletedAtIsNull(ledgerId, uniqueIds)
			!= uniqueIds.size()) {
			throw new ForbiddenException(ErrorCode.ACCOUNT_NOT_ACCESSIBLE,
				"One or more accounts are not accessible in ledger " + ledgerId);
		}
	}

	@Transactional(readOnly = true)
	public void requireShareTarget(UUID ledgerId, UUID ownerUserId) {
		if (ledgerId != null && !ledgerAccessChecker.canReadLedger(ledgerId, ownerUserId)) {
			throw new ForbiddenException(ErrorCode.ACCOUNT_SHARE_TARGET_INVALID,
				"cannot share into a ledger you are not a member of: " + ledgerId);
		}
	}
}
