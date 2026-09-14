package com.monevo.ledger.controller;

import com.monevo.common.response.ApiResponse;
import com.monevo.common.security.CurrentUser;
import com.monevo.ledger.dto.*;
import com.monevo.ledger.service.LedgerInviteService;
import com.monevo.ledger.service.LedgerMemberService;
import com.monevo.ledger.service.LedgerService;
import com.monevo.meta.service.CurrencyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ledgers")
@PreAuthorize("hasRole('USER')")
@RequiredArgsConstructor
public class LedgerController {
	private final LedgerService ledgerService;
	private final LedgerMemberService ledgerMemberService;
	private final CurrencyService currencyService;
	private final LedgerInviteService ledgerInviteService;

	@GetMapping
	public ApiResponse.Success<List<LedgerDetail>> getMyLedgers(@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(ledgerService.getMyLedgers(me.id()));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse.Success<LedgerDetail> createLedger(@Valid @RequestBody LedgerCreateRequest request,
														@AuthenticationPrincipal CurrentUser me) {
		currencyService.require(request.currency());
		return ApiResponse.ok(ledgerService.createLedger(request, me.id(), me.locale()));
	}

	@GetMapping("/{id}")
	public ApiResponse.Success<LedgerDetail> getLedger(@PathVariable("id") UUID ledgerId,
													@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(ledgerService.getLedger(ledgerId, me.id()));
	}

	@PatchMapping("/{id}")
	public ApiResponse.Success<LedgerDetail> updateLedger(@PathVariable("id") UUID ledgerId,
														@Valid @RequestBody LedgerUpdateRequest request,
														@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(ledgerService.updateLedgerName(request, ledgerId, me.id()));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void removeLedger(@PathVariable("id") UUID ledgerId,
							@AuthenticationPrincipal CurrentUser me) {
		ledgerService.deleteLedger(ledgerId, me.id());
	}

	@GetMapping("/{id}/members")
	public ApiResponse.Success<List<LedgerMemberDetail>> getLedgerMembers(@PathVariable("id") UUID ledgerId,
																		@AuthenticationPrincipal CurrentUser me
	) {
		return ApiResponse.ok(ledgerMemberService.getLedgerMembers(ledgerId, me.id()));
	}

	@DeleteMapping("/{id}/members/{userId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void removeMember(@PathVariable("id") UUID ledgerId, @PathVariable("userId") UUID userId,
							@AuthenticationPrincipal CurrentUser me) {
		if (me.id().equals(userId)) {
			ledgerMemberService.exitFromLedger(ledgerId, me.id());
		} else {
			ledgerMemberService.evictMemberFromLedger(ledgerId, userId, me.id());
		}
	}

	@PostMapping("/{id}/invites")
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse.Success<LedgerInviteResponse> createInvitation(@PathVariable("id") UUID ledgerId,
																	@Valid @RequestBody(required = false) LedgerInviteRequest request,
																	@AuthenticationPrincipal CurrentUser me) {

		return ApiResponse.ok(ledgerInviteService.issueInviteCode(ledgerId, me.id(), request));
	}

	@GetMapping("/{id}/invites")
	public ApiResponse.Success<List<LedgerInviteResponse>> getValidInvitations(@PathVariable("id") UUID ledgerId,
																			@AuthenticationPrincipal CurrentUser me) {

		return ApiResponse.ok(ledgerInviteService.getValidInviteCodes(ledgerId, me.id()));
	}

	@DeleteMapping("/{id}/invites/{inviteId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void invalidateInvitation(@PathVariable("id") UUID ledgerId,
									@PathVariable("inviteId") UUID inviteId,
									@AuthenticationPrincipal CurrentUser me) {
		ledgerInviteService.deleteInvite(ledgerId, inviteId, me.id());
	}
}
