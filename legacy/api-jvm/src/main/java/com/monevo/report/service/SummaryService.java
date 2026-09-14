package com.monevo.report.service;

import com.monevo.account.entity.Account;
import com.monevo.account.service.AccountAccessChecker;
import com.monevo.account.service.AccountService;
import com.monevo.account.service.CategoryService;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ValidationException;
import com.monevo.ledger.service.LedgerAccessChecker;
import com.monevo.ledger.service.LedgerService;
import com.monevo.report.dto.AccountSummary;
import com.monevo.report.dto.CategorySummaryNode;
import com.monevo.report.dto.MonthlySummary;
import com.monevo.report.dto.PeriodSummary;
import com.monevo.report.dto.PeriodSummaryPoint;
import com.monevo.report.dto.SummaryBucket;
import com.monevo.report.repository.SummaryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class SummaryService {
	private static final String UNKNOWN_NAME = "Unknown";
	private static final int MAX_FILTER_IDS = 50;
	private static final int MAX_PERIOD_DAYS = 366;

	private final SummaryRepository summaryRepository;
	private final LedgerAccessChecker ledgerAccessChecker;
	private final AccountAccessChecker accountAccessChecker;
	private final LedgerService ledgerService;
	private final CategoryService categoryService;
	private final AccountService accountService;

	@Transactional(readOnly = true)
	public MonthlySummary getMonthlySummary(UUID ledgerId, YearMonth month, List<UUID> accountIds,
												List<UUID> categoryIds, UUID requesterId) {
		LocalDate from = month.atDay(1);
		LocalDate to = month.atEndOfMonth();
		QueryScope scope = scope(ledgerId, accountIds, categoryIds, requesterId);
		SummaryValues values = summarize(ledgerId, from, to, scope);

		return new MonthlySummary(
			ledgerId,
			month.toString(),
			scope.currency(),
			values.incomeMinor(),
			values.expenseMinor(),
			values.netMinor(),
			values.byCategory(),
			values.byAccount()
		);
	}

	@Transactional(readOnly = true)
	public PeriodSummary getPeriodSummary(UUID ledgerId, LocalDate from, LocalDate to, SummaryBucket bucket,
												List<UUID> accountIds, List<UUID> categoryIds, UUID requesterId) {
		validatePeriod(from, to);
		QueryScope scope = scope(ledgerId, accountIds, categoryIds, requesterId);
		SummaryValues values = summarize(ledgerId, from, to, scope);
		List<SummaryRepository.DailyTotal> dailyTotals = summaryRepository.dailyTotals(ledgerId,
			scope.accountFilter(), scope.accountIds(), scope.categoryFilter(), scope.categoryIds(), from, to);

		return new PeriodSummary(ledgerId, from, to, scope.currency(), values.incomeMinor(), values.expenseMinor(),
			values.netMinor(), bucket, toSeries(from, to, bucket, dailyTotals), values.byCategory(), values.byAccount());
	}

	private QueryScope scope(UUID ledgerId, List<UUID> accountIds, List<UUID> categoryIds, UUID requesterId) {
		ledgerAccessChecker.requireMember(ledgerId, requesterId);
		List<UUID> normalizedAccountIds = normalized(accountIds, "accountId");
		List<UUID> normalizedCategoryIds = normalized(categoryIds, "categoryId");
		accountAccessChecker.requireUsableAccounts(normalizedAccountIds, ledgerId);
		Set<UUID> expandedCategoryIds = categoryService.selfAndChildIds(normalizedCategoryIds, ledgerId);
		return QueryScope.of(normalizedAccountIds, expandedCategoryIds, ledgerService.baseCurrencyOf(ledgerId));
	}

	private SummaryValues summarize(UUID ledgerId, LocalDate from, LocalDate to, QueryScope scope) {
		SummaryRepository.Totals totals = summaryRepository.totals(ledgerId,
			scope.accountFilter(), scope.accountIds(), scope.categoryFilter(), scope.categoryIds(), from, to);
		List<SummaryRepository.AccountTotal> accountTotals = summaryRepository.expenseByAccount(ledgerId,
			scope.accountFilter(), scope.accountIds(), scope.categoryFilter(), scope.categoryIds(), from, to);
		List<SummaryRepository.CategoryTotal> categoryTotals = summaryRepository.expenseByCategory(ledgerId,
			scope.accountFilter(), scope.accountIds(), scope.categoryFilter(), scope.categoryIds(), from, to);
		long incomeMinor = totals.getIncomeMinor();
		long expenseMinor = totals.getExpenseMinor();
		return new SummaryValues(incomeMinor, expenseMinor, incomeMinor - expenseMinor,
			rollUp(categoryTotals), toAccountSummaries(accountTotals));
	}

	private static void validatePeriod(LocalDate from, LocalDate to) {
		if (from.isAfter(to)) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED, "from must be on or before to");
		}
		if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_PERIOD_DAYS) {
			throw new ValidationException(ErrorCode.VALIDATION_FAILED,
				"analysis accepts at most " + MAX_PERIOD_DAYS + " days");
		}
	}

	private static List<PeriodSummaryPoint> toSeries(LocalDate from, LocalDate to, SummaryBucket bucket,
															List<SummaryRepository.DailyTotal> dailyTotals) {
		Map<LocalDate, long[]> amounts = new HashMap<>();
		for (SummaryRepository.DailyTotal daily : dailyTotals) {
			LocalDate key = bucket == SummaryBucket.DAY ? daily.getPeriodDate() : daily.getPeriodDate().withDayOfMonth(1);
			long[] value = amounts.computeIfAbsent(key, ignored -> new long[2]);
			value[0] += daily.getIncomeMinor();
			value[1] += daily.getExpenseMinor();
		}

		LocalDate cursor = bucket == SummaryBucket.DAY ? from : from.withDayOfMonth(1);
		LocalDate last = bucket == SummaryBucket.DAY ? to : to.withDayOfMonth(1);
		List<PeriodSummaryPoint> result = new ArrayList<>();
		while (!cursor.isAfter(last)) {
			long[] value = amounts.getOrDefault(cursor, new long[2]);
			result.add(new PeriodSummaryPoint(cursor, value[0], value[1], value[0] - value[1]));
			cursor = bucket == SummaryBucket.DAY ? cursor.plusDays(1) : cursor.plusMonths(1);
		}
		return result;
	}

	private static List<UUID> normalized(List<UUID> ids, String field) {
		if (ids == null || ids.isEmpty()) {
			return List.of();
		}
		List<UUID> result = List.copyOf(new LinkedHashSet<>(ids));
		if (result.size() > MAX_FILTER_IDS) {
			throw new ValidationException(
				ErrorCode.VALIDATION_FAILED,
				field + " accepts at most " + MAX_FILTER_IDS + " values");
		}
		return result;
	}

	private List<CategorySummaryNode> rollUp(List<SummaryRepository.CategoryTotal> leafTotals) {
		List<UUID> leafIds = leafTotals.stream().map(SummaryRepository.CategoryTotal::getCategoryId).toList();
		Map<UUID, Account> categoryMap = categoryService.categoriesByIds(leafIds);

		Map<UUID, Long> ownSpendByRoot = new HashMap<>();
		Map<UUID, List<CategorySummaryNode>> childrenByRoot = new HashMap<>();

		for (SummaryRepository.CategoryTotal leaf : leafTotals) {
			Account category = categoryMap.get(leaf.getCategoryId());
			UUID parentId = category != null ? category.getParentId() : null;

			if (parentId == null) {
				ownSpendByRoot.merge(leaf.getCategoryId(), leaf.getExpenseMinor(), Long::sum);
				continue;
			}

			childrenByRoot.computeIfAbsent(parentId, key -> new ArrayList<>())
				.add(new CategorySummaryNode(leaf.getCategoryId(), nameOf(categoryMap, leaf.getCategoryId()),
					leaf.getExpenseMinor(), List.of()));
		}

		Set<UUID> rootIds = new LinkedHashSet<>(ownSpendByRoot.keySet());
		rootIds.addAll(childrenByRoot.keySet());

		List<CategorySummaryNode> result = new ArrayList<>();
		for (UUID rootId : rootIds) {
			List<CategorySummaryNode> children = new ArrayList<>(childrenByRoot.getOrDefault(rootId, List.of()));
			children.sort(byAmountThenName());

			long rolledUp = ownSpendByRoot.getOrDefault(rootId, 0L)
				+ children.stream().mapToLong(CategorySummaryNode::expenseMinor).sum();
			result.add(new CategorySummaryNode(rootId, nameOf(categoryMap, rootId), rolledUp, children));
		}

		result.sort(byAmountThenName());
		return result;
	}

	private static Comparator<CategorySummaryNode> byAmountThenName() {
		return Comparator.comparingLong(CategorySummaryNode::expenseMinor).reversed()
			.thenComparing(CategorySummaryNode::name);
	}

	private static String nameOf(Map<UUID, Account> categoryMap, UUID categoryId) {
		Account category = categoryMap.get(categoryId);
		return category != null ? category.getName() : UNKNOWN_NAME;
	}

	private List<AccountSummary> toAccountSummaries(List<SummaryRepository.AccountTotal> totals) {
		List<UUID> accountIds = totals.stream().map(SummaryRepository.AccountTotal::getAccountId).toList();
		Map<UUID, Account> accountMap = accountService.accountsByIds(accountIds);

		return totals.stream().map(t -> {
				Account acc = accountMap.get(t.getAccountId());
				String name = acc != null ? acc.getName() : UNKNOWN_NAME;
				return new AccountSummary(t.getAccountId(), name, t.getExpenseMinor());
			})
			.sorted(Comparator.comparingLong(AccountSummary::expenseMinor).reversed()
				.thenComparing(AccountSummary::name))
			.toList();
	}

	private record QueryScope(boolean accountFilter, List<UUID> accountIds, boolean categoryFilter,
								List<UUID> categoryIds, String currency) {

		private static final UUID NO_FILTER_SENTINEL = new UUID(0, 0);

		static QueryScope of(List<UUID> accountIds, Set<UUID> categoryIds, String currency) {
			boolean byAccount = !accountIds.isEmpty();
			boolean byCategory = !categoryIds.isEmpty();
			return new QueryScope(
				byAccount, byAccount ? accountIds : List.of(NO_FILTER_SENTINEL),
				byCategory, byCategory ? List.copyOf(categoryIds) : List.of(NO_FILTER_SENTINEL),
				currency);
		}
	}

	private record SummaryValues(long incomeMinor, long expenseMinor, long netMinor,
								List<CategorySummaryNode> byCategory, List<AccountSummary> byAccount) {
	}
}
