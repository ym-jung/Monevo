package com.monevo.account.service;

import com.monevo.account.entity.Account;
import com.monevo.account.repository.AccountRepository;
import com.monevo.account.repository.LedgerAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LedgerAccountLinkService {

	private final AccountRepository accountRepository;
	private final LedgerAccountRepository ledgerAccountRepository;

	@Transactional
	public void unlinkOwnedAccounts(UUID ledgerId, UUID ownerUserId, UUID actorId, Instant at) {
		Set<UUID> ownedAccountIds = accountRepository
			.findByOwnerUserIdAndSubtypeAndDeletedAtIsNullOrderBySortOrderAscNameAsc(ownerUserId, Account.Subtype.REAL)
			.stream()
			.map(Account::getId)
			.collect(Collectors.toSet());
		if (ownedAccountIds.isEmpty()) {
			return;
		}
		ledgerAccountRepository.findByLedgerIdAndDeletedAtIsNull(ledgerId).stream()
			.filter(link -> ownedAccountIds.contains(link.getAccountId()))
			.forEach(link -> link.softDelete(actorId, at));
	}

	@Transactional
	public void unlinkAllInLedger(UUID ledgerId, UUID actorId, Instant at) {
		ledgerAccountRepository.findByLedgerIdAndDeletedAtIsNull(ledgerId)
			.forEach(link -> link.softDelete(actorId, at));
	}
}
