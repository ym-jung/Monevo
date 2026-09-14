package com.monevo.account.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AccountUpdateRequest(
	@Size(max = 50) String name,
	@Size(max = 200) String memo,
	Boolean archived,
	@NotNull Long version
) {
}
