package com.monevo.account.dto;

import com.monevo.account.entity.Account;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

public record AccountCreateRequest(
	@NotBlank @Size(max = 50) String name,
	@NotNull Account.Type type,
	@NotBlank @Pattern(regexp = "[A-Z]{3}") String currency,
	@Size(max = 50) List<UUID> ledgerIds,
	long openingBalanceMinor,
	@Size(max = 200) String memo
) {
	public AccountCreateRequest {
		ledgerIds = ledgerIds == null ? List.of() : List.copyOf(new LinkedHashSet<>(ledgerIds));
	}
}
