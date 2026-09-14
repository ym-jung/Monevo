package com.monevo.journal.dto;

import com.monevo.journal.entity.JournalEntry;

import java.time.LocalDate;
import java.util.UUID;

public record JournalEntrySummary(
	UUID id,
	JournalEntry.Kind kind,
	LocalDate entryDate,
	String description,
	int lineCount,
	long baseAmountMinor,
	Long amountMinor,
	String currency,
	AccountRef primaryAccount,
	AccountRef counterAccount
) {
}
