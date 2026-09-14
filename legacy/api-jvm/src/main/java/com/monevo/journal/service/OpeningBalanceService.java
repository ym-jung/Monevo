package com.monevo.journal.service;

import com.monevo.account.entity.Account;
import com.monevo.account.service.EquityAccountService;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.common.util.UuidV7;
import com.monevo.journal.entity.FxRateSource;
import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;
import com.monevo.journal.repository.JournalEntryRepository;
import com.monevo.journal.repository.JournalLineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OpeningBalanceService {
	private static final String DESCRIPTION = "Opening balance";

	private final EquityAccountService equityAccountService;
	private final JournalEntryRepository journalEntryRepository;
	private final JournalLineRepository journalLineRepository;

	private static String marker(UUID accountId) {
		return "opening:" + accountId;
	}

	@Transactional
	public void record(Account account, long openingBalanceMinor) {
		if (openingBalanceMinor == 0) {
			return;
		}
		if (journalEntryRepository.existsByCreateRequestHashAndDeletedAtIsNull(marker(account.getId()))) {
			throw new ConflictException(ErrorCode.OPENING_BALANCE_ALREADY_SET,
				"This account already has an opening balance.");
		}

		Account equity = equityAccountService.findOrCreateFor(account.getOwnerUserId());
		JournalEntry entry = journalEntryRepository.saveAndFlush(JournalEntry.opening(
			account.getOwnerUserId(), LocalDate.now(), DESCRIPTION,
			UuidV7.generate(), marker(account.getId())));

		long amount = Math.abs(openingBalanceMinor);
		JournalLine.Side assetSide = openingBalanceMinor > 0 ? JournalLine.Side.DEBIT : JournalLine.Side.CREDIT;
		JournalLine.Side equitySide = openingBalanceMinor > 0 ? JournalLine.Side.CREDIT : JournalLine.Side.DEBIT;

		journalLineRepository.saveAll(List.of(
			JournalLine.of(entry.getId(), (short) 0, assetSide, account.getId(), account.getCurrency(),
				amount, BigDecimal.ONE, amount, FxRateSource.SAME_CURRENCY, null, null),
			JournalLine.of(entry.getId(), (short) 1, equitySide, equity.getId(), account.getCurrency(),
				amount, BigDecimal.ONE, amount, FxRateSource.SAME_CURRENCY, null, null)));
		journalLineRepository.flush();
	}

	@Transactional
	public void discard(UUID accountId, UUID actorId) {
		Instant now = Instant.now();
		journalEntryRepository.findByCreateRequestHashAndDeletedAtIsNull(marker(accountId))
			.forEach(entry -> {
				journalLineRepository.softDeleteAllByEntryId(entry.getId(), actorId, now);
				entry.softDelete(actorId, now);
			});
	}
}
