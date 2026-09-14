package com.monevo.report.dto;

import java.util.UUID;

public record AccountSummary(
	UUID accountId,
	String name,
	long expenseMinor
) {
}
