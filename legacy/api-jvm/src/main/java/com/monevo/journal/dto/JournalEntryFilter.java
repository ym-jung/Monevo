package com.monevo.journal.dto;

import com.monevo.journal.entity.JournalEntry;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

public record JournalEntryFilter(
	UUID ledgerId,
	LocalDate from,
	LocalDate to,
	List<UUID> accountIds,
	List<UUID> categoryIds,
	List<JournalEntry.Kind> kinds
) {
	public JournalEntryFilter {
		accountIds = normalized(accountIds);
		categoryIds = normalized(categoryIds);
		kinds = kinds == null ? List.of() : List.copyOf(new LinkedHashSet<>(kinds));
	}

	private static List<UUID> normalized(List<UUID> ids) {
		return ids == null ? List.of() : List.copyOf(new LinkedHashSet<>(ids));
	}
}
