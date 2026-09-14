package com.monevo.ledger.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record LedgerCreateRequest(
	@NotBlank @Size(max = 100) String name,
	@NotBlank @Pattern(regexp = "[A-Z]{3}") String currency,
	@NotBlank @Size(max = 64) String timezone,
	boolean confirmCurrencyIrreversible
) {
}
