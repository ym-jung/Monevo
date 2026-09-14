package com.monevo.report.controller;

import com.monevo.common.response.ApiResponse;
import com.monevo.common.security.CurrentUser;
import com.monevo.report.dto.MonthlySummary;
import com.monevo.report.dto.PeriodSummary;
import com.monevo.report.dto.SummaryBucket;
import com.monevo.report.service.SummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@RestController
@PreAuthorize("hasRole('USER')")
@RequiredArgsConstructor
public class ReportController {

	private final SummaryService summaryService;

	@GetMapping("/api/v1/ledgers/{id}/summary")
	public ApiResponse.Success<MonthlySummary> getMonthlySummary(@PathVariable("id") UUID ledgerId,
																@RequestParam @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
																@RequestParam(value = "accountId", required = false) List<UUID> accountIds,
																@RequestParam(value = "categoryId", required = false) List<UUID> categoryIds,
																@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(summaryService.getMonthlySummary(ledgerId, month, accountIds, categoryIds, me.id()));
	}

	@GetMapping("/api/v1/ledgers/{id}/analysis")
	public ApiResponse.Success<PeriodSummary> getPeriodSummary(@PathVariable("id") UUID ledgerId,
														@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
														@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
														@RequestParam(defaultValue = "DAY") SummaryBucket bucket,
														@RequestParam(value = "accountId", required = false) List<UUID> accountIds,
														@RequestParam(value = "categoryId", required = false) List<UUID> categoryIds,
														@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(summaryService.getPeriodSummary(ledgerId, from, to, bucket, accountIds, categoryIds, me.id()));
	}
}
