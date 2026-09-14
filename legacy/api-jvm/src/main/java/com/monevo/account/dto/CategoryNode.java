package com.monevo.account.dto;

import com.monevo.account.entity.Account;

import java.util.List;
import java.util.UUID;

public record CategoryNode(
	UUID id,
	String name,
	CategoryKind kind,
	boolean isSystem,
	short sortOrder,
	List<CategoryNode> children
) {
	public static CategoryNode from(Account category, List<CategoryNode> children) {
		return new CategoryNode(
			category.getId(),
			category.getName(),
			CategoryKind.of(category.getNature()),
			category.isSystem(),
			category.getSortOrder(),
			children == null ? List.of() : children
		);
	}
}
