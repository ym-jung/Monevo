package com.monevo.report.dto;

import java.util.List;
import java.util.UUID;

public record CategorySummaryNode(
	UUID categoryId,
	String name,
	long expenseMinor,
	List<CategorySummaryNode> children
) {
}
