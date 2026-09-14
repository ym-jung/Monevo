package com.monevo.journal.controller;

import com.monevo.common.response.ApiResponse;
import com.monevo.common.response.PageResponse;
import com.monevo.common.security.CurrentUser;
import com.monevo.journal.dto.JournalEntryCreateRequest;
import com.monevo.journal.dto.JournalEntryDetail;
import com.monevo.journal.dto.JournalEntryFilter;
import com.monevo.journal.dto.JournalEntrySummary;
import com.monevo.journal.dto.JournalEntryUpdateRequest;
import com.monevo.journal.entity.JournalEntry;
import com.monevo.journal.service.JournalEntryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/journal-entries")
@PreAuthorize("hasRole('USER')")
@RequiredArgsConstructor
public class JournalEntryController {
	private static final int MAX_PAGE_SIZE = 100;

	static final Sort LIST_SORT = Sort.by(Sort.Direction.DESC, "entryDate").and(Sort.by(Sort.Direction.DESC, "id"));

	private final JournalEntryService journalEntryService;

	static Pageable pageable(int page, int size) {
		return PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE), LIST_SORT);
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse.Success<JournalEntryDetail> createEntry(@Valid @RequestBody JournalEntryCreateRequest request,
															@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(journalEntryService.create(request, me.id()));
	}

	@GetMapping
	public ApiResponse.Success<PageResponse<JournalEntrySummary>> getEntries(
		@RequestParam UUID ledgerId,
		@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
		@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
		@RequestParam(required = false) List<UUID> accountId,
		@RequestParam(required = false) List<UUID> categoryId,
		@RequestParam(required = false) List<JournalEntry.Kind> kind,
		@RequestParam(defaultValue = "0") int page,
		@RequestParam(defaultValue = "50") int size,
		@AuthenticationPrincipal CurrentUser me) {
		JournalEntryFilter filter = new JournalEntryFilter(ledgerId, from, to, accountId, categoryId, kind);

		return ApiResponse.ok(journalEntryService.getEntries(filter, pageable(page, size), me.id()));
	}

	@GetMapping("/{id}")
	public ApiResponse.Success<JournalEntryDetail> getEntry(@PathVariable("id") UUID entryId,
															@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(journalEntryService.getEntry(entryId, me.id()));
	}

	@PatchMapping("/{id}")
	public ApiResponse.Success<JournalEntryDetail> updateEntry(@PathVariable("id") UUID entryId,
																@Valid @RequestBody JournalEntryUpdateRequest request,
																@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(journalEntryService.update(entryId, request, me.id()));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteEntry(@PathVariable("id") UUID entryId,
							@AuthenticationPrincipal CurrentUser me) {
		journalEntryService.delete(entryId, me.id());
	}
}
