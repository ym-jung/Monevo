package com.monevo.journal.service;

import com.monevo.account.entity.Account;
import com.monevo.account.service.AccountService;
import com.monevo.account.service.CategoryService;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ConflictException;
import com.monevo.common.error.types.NotFoundException;
import com.monevo.common.error.types.ValidationException;
import com.monevo.journal.dto.JournalLineInput;
import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class JournalEntryValidator {
	private final AccountService accountService;
	private final CategoryService categoryService;

	public void validateShape(List<JournalLineInput> lines) {
		if (lines == null || lines.size() < 2) {
			throw new ValidationException(ErrorCode.JOURNAL_ENTRY_SHAPE_INVALID,
				"An entry needs at least two lines.");
		}

		Set<UUID> debitAccounts = new HashSet<>();
		Set<UUID> creditAccounts = new HashSet<>();
		for (JournalLineInput line : lines) {
			if (line.amountMinor() <= 0) {
				throw new ValidationException(ErrorCode.TRANSACTION_AMOUNT_INVALID, "amountMinor must be positive");
			}
			Set<UUID> bucket = line.side() == JournalLine.Side.DEBIT ? debitAccounts : creditAccounts;
			bucket.add(line.accountId());
		}

		if (debitAccounts.isEmpty() || creditAccounts.isEmpty()) {
			throw new ValidationException(ErrorCode.JOURNAL_ENTRY_SHAPE_INVALID,
				"An entry needs at least one debit line and one credit line.");
		}

		if (!Collections.disjoint(debitAccounts, creditAccounts)) {
			throw new ValidationException(ErrorCode.JOURNAL_LINE_DUPLICATE_ACCOUNT,
				"The same account cannot be on both sides of one entry.");
		}
	}

	public Map<UUID, Account> resolveAccounts(List<JournalLineInput> lines, UUID ledgerId, UUID actorId) {
		Set<UUID> ids = new LinkedHashSet<>();
		lines.forEach(line -> ids.add(line.accountId()));

		Map<UUID, Account> found = accountService.accountsByIds(ids);
		Map<UUID, Account> resolved = new HashMap<>(ids.size());
		for (UUID id : ids) {
			resolved.put(id, checkUsable(found.get(id), id, ledgerId, actorId));
		}
		return resolved;
	}

	private Account checkUsable(Account account, UUID accountId, UUID ledgerId, UUID actorId) {
		if (account == null) {
			throw new NotFoundException(ErrorCode.ACCOUNT_NOT_FOUND, "account not found: " + accountId);
		}

		if (account.isSystemAccount()) {
			throw new ValidationException(ErrorCode.JOURNAL_LINE_ACCOUNT_INVALID,
				"System accounts cannot be used directly.");
		}

		if (account.isCategory()) {
			categoryService.requireLeafInLedger(accountId, ledgerId);
			return account;
		}

		Account usable = accountService.requireUsableAccount(accountId, ledgerId, actorId);
		if (usable.isArchived()) {
			throw new ConflictException(ErrorCode.ACCOUNT_ARCHIVED, "Account " + accountId + " is archived.");
		}
		return usable;
	}

	public String resolveCurrency(JournalLineInput line, Account account, String fallbackCurrency) {
		if (account.isReal()) {
			if (line.currency() != null && !line.currency().equals(account.getCurrency())) {
				throw new ValidationException(ErrorCode.TRANSACTION_CURRENCY_MISMATCH,
					"Currency must match the account: " + account.getCurrency());
			}
			return account.getCurrency();
		}
		return line.currency() != null ? line.currency() : fallbackCurrency;
	}

	public String moneySideCurrency(List<JournalLineInput> lines, Map<UUID, Account> accounts, String baseCurrency) {
		String found = null;
		for (JournalLineInput line : lines) {
			Account account = accounts.get(line.accountId());
			if (account == null || !account.isReal()) {
				continue;
			}
			if (found == null) {
				found = account.getCurrency();
			} else if (!found.equals(account.getCurrency())) {
				return baseCurrency;
			}
		}
		return found != null ? found : baseCurrency;
	}

	public void requireBalanced(List<JournalFxPricer.PricedLine> lines, String baseCurrency) {
		long diff = 0;
		for (JournalFxPricer.PricedLine line : lines) {
			diff += line.side() == JournalLine.Side.DEBIT ? line.baseAmountMinor() : -line.baseAmountMinor();
		}
		if (diff != 0) {
			throw new ValidationException(ErrorCode.JOURNAL_ENTRY_UNBALANCED,
				"debits and credits differ by " + Math.abs(diff) + " " + baseCurrency);
		}
	}

	public JournalEntry.Kind deriveKind(List<JournalLineInput> lines, Map<UUID, Account> accounts) {
		boolean allMoney = true;
		boolean hasExpense = false;
		boolean hasIncome = false;
		for (JournalLineInput line : lines) {
			Account account = accounts.get(line.accountId());
			switch (account.getNature()) {
				case EXPENSE -> {
					hasExpense = true;
					allMoney = false;
				}
				case INCOME -> {
					hasIncome = true;
					allMoney = false;
				}
				default -> {
				}
			}
		}

		if (allMoney) {
			return JournalEntry.Kind.TRANSFER;
		}
		if (hasExpense && hasIncome) {
			return JournalEntry.Kind.SPLIT;
		}
		return hasExpense ? JournalEntry.Kind.EXPENSE : JournalEntry.Kind.INCOME;
	}
}
