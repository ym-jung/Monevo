package com.monevo.journal.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record JournalEntryCreateRequest(
	UUID clientRequestId,
	@NotNull UUID ledgerId,
	@NotNull LocalDate entryDate,
	@NotBlank @Size(max = 200) String description,
	String memo,
	@NotNull @Size(min = 2, max = 191) List<@Valid JournalLineInput> lines
) {
}
