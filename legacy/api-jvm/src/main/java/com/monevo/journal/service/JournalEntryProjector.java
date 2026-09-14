package com.monevo.journal.service;

import com.monevo.account.entity.Account;
import com.monevo.account.service.AccountService;
import com.monevo.journal.dto.AccountRef;
import com.monevo.journal.dto.JournalEntryDetail;
import com.monevo.journal.dto.JournalEntrySummary;
import com.monevo.journal.dto.JournalLineView;
import com.monevo.journal.dto.UserRef;
import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;
import com.monevo.journal.repository.JournalLineRepository;
import com.monevo.user.entity.AppUser;
import com.monevo.user.service.AppUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class JournalEntryProjector {

	private final JournalLineRepository journalLineRepository;
	private final AccountService accountService;
	private final AppUserService appUserService;

	@Transactional(readOnly = true)
	public JournalEntryDetail toDetail(JournalEntry entry, String baseCurrency) {
		List<JournalLine> lines = journalLineRepository
			.findByEntryIdAndDeletedAtIsNullOrderByLineNoAsc(entry.getId());
		Map<UUID, Account> accounts = accountsFor(List.of(lines));
		Map<UUID, AppUser> users = appUserService.usersByIds(
			Arrays.asList(entry.getCreatedByUserId(), entry.getUpdatedBy()));

		List<JournalLineView> views = lines.stream()
			.map(line -> JournalLineView.from(line, accountRef(accounts, line.getAccountId())))
			.toList();

		return JournalEntryDetail.from(entry, views, baseCurrency,
			UserRef.from(users.get(entry.getCreatedByUserId())),
			UserRef.from(users.get(entry.getUpdatedBy())));
	}

	@Transactional(readOnly = true)
	public List<JournalEntrySummary> toSummaries(List<JournalEntry> entries) {
		if (entries.isEmpty()) {
			return List.of();
		}
		Map<UUID, List<JournalLine>> linesByEntry = linesByEntry(entries);
		Map<UUID, Account> accounts = accountsFor(linesByEntry.values());

		return entries.stream()
			.map(entry -> summarize(entry, linesByEntry.getOrDefault(entry.getId(), List.of()), accounts))
			.toList();
	}

	private Map<UUID, List<JournalLine>> linesByEntry(List<JournalEntry> entries) {
		List<UUID> ids = entries.stream().map(JournalEntry::getId).toList();
		Map<UUID, List<JournalLine>> grouped = new HashMap<>();
		for (JournalLine line : journalLineRepository.findByEntryIdInAndDeletedAtIsNullOrderByLineNoAsc(ids)) {
			grouped.computeIfAbsent(line.getEntryId(), key -> new ArrayList<>()).add(line);
		}
		return grouped;
	}

	private Map<UUID, Account> accountsFor(Collection<List<JournalLine>> lineGroups) {
		Set<UUID> ids = new HashSet<>();
		lineGroups.forEach(lines -> lines.forEach(line -> ids.add(line.getAccountId())));
		return accountService.accountsWithParents(ids);
	}

	private static JournalEntrySummary summarize(JournalEntry entry, List<JournalLine> lines,
												Map<UUID, Account> accounts) {
		long debitBase = lines.stream().filter(JournalLine::isDebit)
			.mapToLong(JournalLine::getBaseAmountMinor).sum();

		Set<String> currencies = new HashSet<>();
		lines.forEach(line -> currencies.add(line.getCurrency()));
		String currency = currencies.size() == 1 ? currencies.iterator().next() : null;
		Long amountMinor = currency == null ? null
			: lines.stream().filter(JournalLine::isDebit).mapToLong(JournalLine::getAmountMinor).sum();

		SidePair sides = resolveSides(entry, lines, accounts);

		return new JournalEntrySummary(entry.getId(), entry.getKind(), entry.getEntryDate(),
			entry.getDescription(), lines.size(), debitBase, amountMinor, currency,
			sides.primary(), sides.counter());
	}

	private static SidePair resolveSides(JournalEntry entry, List<JournalLine> lines,
										Map<UUID, Account> accounts) {
		if (lines.size() == 2) {
			return twoLineSides(entry, lines, accounts);
		}
		return new SidePair(soleRealAccount(lines, accounts), null);
	}

	private static SidePair twoLineSides(JournalEntry entry, List<JournalLine> lines,
										Map<UUID, Account> accounts) {
		JournalLine debit = lines.get(0).isDebit() ? lines.get(0) : lines.get(1);
		JournalLine credit = lines.get(0).isDebit() ? lines.get(1) : lines.get(0);
		Account debitAccount = accounts.get(debit.getAccountId());
		boolean moneyIsDebit = debitAccount != null && debitAccount.isReal()
			&& entry.getKind() != JournalEntry.Kind.TRANSFER;

		return new SidePair(
			accountRef(accounts, (moneyIsDebit ? debit : credit).getAccountId()),
			accountRef(accounts, (moneyIsDebit ? credit : debit).getAccountId()));
	}

	private static AccountRef soleRealAccount(List<JournalLine> lines, Map<UUID, Account> accounts) {
		List<JournalLine> realLines = lines.stream()
			.filter(line -> {
				Account account = accounts.get(line.getAccountId());
				return account != null && account.isReal();
			})
			.toList();
		return realLines.size() == 1 ? accountRef(accounts, realLines.get(0).getAccountId()) : null;
	}

	private static AccountRef accountRef(Map<UUID, Account> accounts, UUID accountId) {
		Account account = accounts.get(accountId);
		if (account == null) {
			return null;
		}
		Account parent = account.getParentId() == null ? null : accounts.get(account.getParentId());
		return AccountRef.from(account, parent == null ? null : parent.getName());
	}

	private record SidePair(AccountRef primary, AccountRef counter) {
	}
}
