package com.monevo.account.dto;

import jakarta.validation.constraints.Size;

public record CategoryUpdateRequest(
	@Size(max = 40) String name,
	Short sortOrder
) {
}
