package com.monevo.report.dto;

import java.time.LocalDate;

public record PeriodSummaryPoint(
	LocalDate periodStart,
	long incomeMinor,
	long expenseMinor,
	long netMinor
) {
}
