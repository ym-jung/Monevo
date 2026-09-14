package com.monevo.report.dto;

import java.util.List;
import java.util.UUID;

public record MonthlySummary(
	UUID ledgerId,
	String month,
	String currency,
	long incomeMinor,
	long expenseMinor,
	long netMinor,
	List<CategorySummaryNode> byCategory,
	List<AccountSummary> byAccount
) {
}
