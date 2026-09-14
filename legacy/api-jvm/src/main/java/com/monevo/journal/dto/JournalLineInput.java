package com.monevo.journal.dto;

import com.monevo.journal.entity.JournalLine;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.util.UUID;

public record JournalLineInput(
	@NotNull JournalLine.Side side,
	@NotNull UUID accountId,
	@Positive long amountMinor,
	String currency,
	BigDecimal fxRate,
	String memo
) {
}
