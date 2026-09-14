package com.monevo.report.repository;

import com.monevo.journal.entity.JournalEntry;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface SummaryRepository extends Repository<JournalEntry, UUID> {
	String SCOPE = """
		FROM journal_line l
		JOIN journal_entry e ON e.id = l.entry_id AND e.deleted_at IS NULL
		JOIN account a ON a.id = l.account_id
		WHERE e.ledger_id = :ledgerId
		AND l.deleted_at IS NULL
		AND e.entry_date BETWEEN :from AND :to
		AND (:accountFilter = false OR EXISTS (
			SELECT 1 FROM journal_line f
			WHERE f.entry_id = e.id AND f.deleted_at IS NULL AND f.account_id IN (:accountIds)))
		AND (:categoryFilter = false OR EXISTS (
			SELECT 1 FROM journal_line g
			WHERE g.entry_id = e.id AND g.deleted_at IS NULL AND g.account_id IN (:categoryIds)))
		""";

	String ONLY_ASKED_CATEGORIES = """
		AND (:categoryFilter = false OR l.account_id IN (:categoryIds))
		""";

	@Query(value = """
		SELECT COALESCE(SUM(l.base_amount_minor) FILTER (WHERE a.nature = 'INCOME' AND l.side = 'CREDIT'), 0) AS incomeMinor,
			COALESCE(SUM(l.base_amount_minor) FILTER (WHERE a.nature = 'EXPENSE' AND l.side = 'DEBIT'), 0) AS expenseMinor
		""" + SCOPE + ONLY_ASKED_CATEGORIES, nativeQuery = true)
	Totals totals(@Param("ledgerId") UUID ledgerId,
				@Param("accountFilter") boolean accountFilter, @Param("accountIds") List<UUID> accountIds,
				@Param("categoryFilter") boolean categoryFilter, @Param("categoryIds") List<UUID> categoryIds,
				@Param("from") LocalDate from, @Param("to") LocalDate to);

	@Query(value = """
		SELECT l.account_id AS categoryId, SUM(l.base_amount_minor) AS expenseMinor
		""" + SCOPE + ONLY_ASKED_CATEGORIES + """
		AND a.nature = 'EXPENSE' AND l.side = 'DEBIT'
		GROUP BY l.account_id
		""", nativeQuery = true)
	List<CategoryTotal> expenseByCategory(@Param("ledgerId") UUID ledgerId,
										@Param("accountFilter") boolean accountFilter, @Param("accountIds") List<UUID> accountIds,
										@Param("categoryFilter") boolean categoryFilter, @Param("categoryIds") List<UUID> categoryIds,
										@Param("from") LocalDate from, @Param("to") LocalDate to);

	@Query(value = """
		SELECT l.account_id AS accountId, SUM(l.base_amount_minor) AS expenseMinor
		""" + SCOPE + """
		AND a.nature IN ('ASSET', 'LIABILITY') AND l.side = 'CREDIT'
		AND EXISTS (
			SELECT 1 FROM journal_line d
			JOIN account da ON da.id = d.account_id
			WHERE d.entry_id = e.id AND d.deleted_at IS NULL
			AND d.side = 'DEBIT' AND da.nature = 'EXPENSE')
		GROUP BY l.account_id
		""", nativeQuery = true)
	List<AccountTotal> expenseByAccount(@Param("ledgerId") UUID ledgerId,
										@Param("accountFilter") boolean accountFilter, @Param("accountIds") List<UUID> accountIds,
										@Param("categoryFilter") boolean categoryFilter, @Param("categoryIds") List<UUID> categoryIds,
										@Param("from") LocalDate from, @Param("to") LocalDate to);

	@Query(value = """
		SELECT e.entry_date AS periodDate,
			COALESCE(SUM(l.base_amount_minor) FILTER (WHERE a.nature = 'INCOME' AND l.side = 'CREDIT'), 0) AS incomeMinor,
			COALESCE(SUM(l.base_amount_minor) FILTER (WHERE a.nature = 'EXPENSE' AND l.side = 'DEBIT'), 0) AS expenseMinor
		""" + SCOPE + ONLY_ASKED_CATEGORIES + """
		GROUP BY e.entry_date
		ORDER BY e.entry_date
		""", nativeQuery = true)
	List<DailyTotal> dailyTotals(@Param("ledgerId") UUID ledgerId,
								@Param("accountFilter") boolean accountFilter, @Param("accountIds") List<UUID> accountIds,
								@Param("categoryFilter") boolean categoryFilter, @Param("categoryIds") List<UUID> categoryIds,
								@Param("from") LocalDate from, @Param("to") LocalDate to);

	interface Totals {
		long getIncomeMinor();

		long getExpenseMinor();
	}

	interface CategoryTotal {
		UUID getCategoryId();

		long getExpenseMinor();
	}

	interface AccountTotal {
		UUID getAccountId();

		long getExpenseMinor();
	}

	interface DailyTotal {
		LocalDate getPeriodDate();

		long getIncomeMinor();

		long getExpenseMinor();
	}
}
