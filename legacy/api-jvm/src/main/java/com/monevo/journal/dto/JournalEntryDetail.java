package com.monevo.journal.dto;

import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.entity.JournalLine;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record JournalEntryDetail(
	UUID id,
	UUID ledgerId,
	JournalEntry.Kind kind,
	LocalDate entryDate,
	String description,
	String memo,
	String baseCurrency,
	long baseAmountMinor,
	List<JournalLineView> lines,
	UserRef createdBy,
	Instant createdAt,
	UserRef updatedBy,
	Instant updatedAt,
	Long version
) {
	public static JournalEntryDetail from(JournalEntry entry, List<JournalLineView> lines,
											String baseCurrency, UserRef createdBy, UserRef updatedBy) {
		long debitTotal = lines.stream()
			.filter(line -> line.side() == JournalLine.Side.DEBIT)
			.mapToLong(JournalLineView::baseAmountMinor)
			.sum();

		return new JournalEntryDetail(
			entry.getId(),
			entry.getLedgerId(),
			entry.getKind(),
			entry.getEntryDate(),
			entry.getDescription(),
			entry.getMemo(),
			baseCurrency,
			debitTotal,
			lines,
			createdBy,
			entry.getCreatedAt(),
			updatedBy,
			entry.getUpdatedAt(),
			entry.getVersion()
		);
	}
}
