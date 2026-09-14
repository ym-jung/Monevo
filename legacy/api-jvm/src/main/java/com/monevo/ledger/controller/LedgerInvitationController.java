package com.monevo.ledger.controller;

import com.monevo.common.response.ApiResponse;
import com.monevo.common.security.CurrentUser;
import com.monevo.ledger.dto.LedgerInviteAcceptResponse;
import com.monevo.ledger.service.LedgerInviteService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/invites")
@PreAuthorize("hasRole('USER')")
@RequiredArgsConstructor
public class LedgerInvitationController {
	private final LedgerInviteService ledgerInviteService;

	@PostMapping("/{code}/accept")
	public ApiResponse.Success<LedgerInviteAcceptResponse> useInvitation(@PathVariable("code") String invitationCode,
																		@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(ledgerInviteService.useInviteCode(invitationCode, me.id()));
	}
}
