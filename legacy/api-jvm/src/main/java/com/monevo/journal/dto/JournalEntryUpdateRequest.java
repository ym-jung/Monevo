package com.monevo.journal.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record JournalEntryUpdateRequest(
	LocalDate entryDate,
	@Size(max = 200) String description,
	String memo,
	@Size(min = 2, max = 191) List<@Valid JournalLineInput> lines,
	@NotNull Long version
) {
}
