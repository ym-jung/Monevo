package com.monevo.report.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PeriodSummary(
	UUID ledgerId,
	LocalDate from,
	LocalDate to,
	String currency,
	long incomeMinor,
	long expenseMinor,
	long netMinor,
	SummaryBucket bucket,
	List<PeriodSummaryPoint> series,
	List<CategorySummaryNode> byCategory,
	List<AccountSummary> byAccount
) {
}
