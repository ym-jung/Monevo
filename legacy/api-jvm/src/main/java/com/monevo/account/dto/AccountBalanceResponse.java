package com.monevo.account.dto;

import java.util.UUID;

public record AccountBalanceResponse(
	UUID accountId,
	String currency,
	long balanceMinor
) {
}
