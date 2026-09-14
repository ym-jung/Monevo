package com.monevo.ledger.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record LedgerInviteRequest(
	@Min(1) @Max(30) Integer expiresInDays,
	@Min(1) @Max(10) Short maxUses
) {
}
