package com.monevo.journal;

import com.monevo.account.entity.Account;
import com.monevo.account.service.AccountService;
import com.monevo.journal.dto.JournalEntrySummary;
import com.monevo.journal.entity.FxRateSource;
import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;
import com.monevo.journal.repository.JournalLineRepository;
import com.monevo.journal.service.JournalEntryProjector;
import com.monevo.user.service.AppUserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
class JournalEntryProjectorTest {
	private static final UUID LEDGER_ID = UUID.randomUUID();
	private static final UUID OWNER_ID = UUID.randomUUID();

	@Mock
	JournalLineRepository journalLineRepository;
	@Mock
	AccountService accountService;
	@Mock
	AppUserService appUserService;
	@InjectMocks
	JournalEntryProjector projector;

	private final Map<UUID, Account> accounts = new HashMap<>();

	@Test
	@DisplayName("an expense names the account it was paid from, and the category as the counterpart")
	void expenseResolvesMoneyOnTheCreditSide() {
		Account card = realAccount("visa");
		Account groceries = categoryAccount("groceries", Account.Nature.EXPENSE);

		JournalEntrySummary summary = summarize(JournalEntry.Kind.EXPENSE,
			line(JournalLine.Side.DEBIT, groceries), line(JournalLine.Side.CREDIT, card));

		assertThat(summary.primaryAccount().name()).isEqualTo("visa");
		assertThat(summary.counterAccount().name()).isEqualTo("groceries");
	}

	@Test
	@DisplayName("income names the account the money landed in")
	void incomeResolvesMoneyOnTheDebitSide() {
		Account bank = realAccount("bank");
		Account salary = categoryAccount("salary", Account.Nature.INCOME);

		JournalEntrySummary summary = summarize(JournalEntry.Kind.INCOME,
			line(JournalLine.Side.DEBIT, bank), line(JournalLine.Side.CREDIT, salary));

		assertThat(summary.primaryAccount().name()).isEqualTo("bank");
		assertThat(summary.counterAccount().name()).isEqualTo("salary");
	}

	@Test
	@DisplayName("a transfer reads credit as the source even though both sides hold money")
	void transferTakesTheCreditSideAsPrimary() {
		Account from = realAccount("bank");
		Account to = realAccount("wallet");

		JournalEntrySummary summary = summarize(JournalEntry.Kind.TRANSFER,
			line(JournalLine.Side.DEBIT, to), line(JournalLine.Side.CREDIT, from));

		assertThat(summary.primaryAccount().name()).isEqualTo("bank");
		assertThat(summary.counterAccount().name()).isEqualTo("wallet");
	}

	@Test
	@DisplayName("a split has no single category, but the one card it was paid with still shows")
	void splitKeepsTheSoleRealAccount() {
		Account card = realAccount("visa");

		JournalEntrySummary summary = summarize(JournalEntry.Kind.EXPENSE,
			line(JournalLine.Side.DEBIT, categoryAccount("food", Account.Nature.EXPENSE)),
			line(JournalLine.Side.DEBIT, categoryAccount("household", Account.Nature.EXPENSE)),
			line(JournalLine.Side.CREDIT, card));

		assertThat(summary.primaryAccount().name()).isEqualTo("visa");
		assertThat(summary.counterAccount()).isNull();
	}

	@Test
	@DisplayName("paid from two accounts at once, so there is no single money side to name")
	void manyLinesWithTwoRealAccountsResolveToNothing() {
		JournalEntrySummary summary = summarize(JournalEntry.Kind.EXPENSE,
			line(JournalLine.Side.DEBIT, categoryAccount("food", Account.Nature.EXPENSE)),
			line(JournalLine.Side.CREDIT, realAccount("visa")),
			line(JournalLine.Side.CREDIT, realAccount("cash")));

		assertThat(summary.primaryAccount()).isNull();
		assertThat(summary.counterAccount()).isNull();
	}

	@Test
	@DisplayName("one currency across the lines gives an amount; two currencies give none")
	void amountIsOnlyReportedWhenTheLinesAgreeOnACurrency() {
		Account card = realAccount("visa");
		Account food = categoryAccount("food", Account.Nature.EXPENSE);

		JournalEntrySummary sameCurrency = summarize(JournalEntry.Kind.EXPENSE,
			line(JournalLine.Side.DEBIT, food), line(JournalLine.Side.CREDIT, card));
		assertThat(sameCurrency.currency()).isEqualTo("JPY");
		assertThat(sameCurrency.amountMinor()).isEqualTo(1000L);

		JournalEntrySummary mixed = summarize(JournalEntry.Kind.EXPENSE,
			line(JournalLine.Side.DEBIT, food, "USD"), line(JournalLine.Side.CREDIT, card, "JPY"));
		assertThat(mixed.currency()).isNull();
		assertThat(mixed.amountMinor()).isNull();
		assertThat(mixed.baseAmountMinor()).isEqualTo(1000L);
	}

	private JournalEntrySummary summarize(JournalEntry.Kind kind, JournalLine... lines) {
		JournalEntry entry = JournalEntry.inLedger(LEDGER_ID, kind, LocalDate.of(2026, 3, 5),
			"probe", null, OWNER_ID, UUID.randomUUID(), "hash");
		given(journalLineRepository.findByEntryIdInAndDeletedAtIsNullOrderByLineNoAsc(any()))
			.willReturn(rebind(entry.getId(), lines));
		given(accountService.accountsWithParents(any())).willReturn(Map.copyOf(accounts));

		return projector.toSummaries(List.of(entry)).get(0);
	}

	private List<JournalLine> rebind(UUID entryId, JournalLine... lines) {
		List<JournalLine> bound = new ArrayList<>();
		short lineNo = 0;
		for (JournalLine line : lines) {
			bound.add(JournalLine.of(entryId, lineNo++, line.getSide(), line.getAccountId(), line.getCurrency(),
				line.getAmountMinor(), line.getFxRate(), line.getBaseAmountMinor(),
				line.getFxRateSource(), null, null));
		}
		return bound;
	}

	private JournalLine line(JournalLine.Side side, Account account) {
		return line(side, account, "JPY");
	}

	private JournalLine line(JournalLine.Side side, Account account, String currency) {
		return JournalLine.of(UUID.randomUUID(), (short) 0, side, account.getId(), currency,
			1000L, BigDecimal.ONE, 1000L, FxRateSource.SAME_CURRENCY, null, null);
	}

	private Account realAccount(String name) {
		Account account = Account.real(OWNER_ID, name, Account.Type.BANK, "JPY", null, (short) 0);
		accounts.put(account.getId(), account);
		return account;
	}

	private Account categoryAccount(String name, Account.Nature nature) {
		Account account = Account.category(LEDGER_ID, null, name, nature, (short) 0, false);
		accounts.put(account.getId(), account);
		return account;
	}
}
