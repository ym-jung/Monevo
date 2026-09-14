package com.monevo.account.service;

import com.monevo.account.entity.Account;
import com.monevo.account.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EquityAccountService {
	private static final String EQUITY_ACCOUNT_NAME = "Opening balances";

	private final AccountRepository accountRepository;

	@Transactional
	public Account findOrCreateFor(UUID ownerUserId) {
		return accountRepository
			.findByOwnerUserIdAndSubtypeAndDeletedAtIsNull(ownerUserId, Account.Subtype.SYSTEM)
			.orElseGet(() -> accountRepository.saveAndFlush(
				Account.equity(ownerUserId, EQUITY_ACCOUNT_NAME)));
	}
}
