package com.monevo.ledger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record LedgerUpdateRequest(
	@NotBlank @Size(max = 100) String name,
	@NotNull Long version
) {
}
