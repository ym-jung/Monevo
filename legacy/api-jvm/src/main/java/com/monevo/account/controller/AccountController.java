package com.monevo.account.controller;

import com.monevo.account.dto.AccountBalanceResponse;
import com.monevo.account.dto.AccountCreateRequest;
import com.monevo.account.dto.AccountDetail;
import com.monevo.account.dto.AccountUpdateRequest;
import com.monevo.account.service.AccountService;
import com.monevo.common.response.ApiResponse;
import com.monevo.common.security.CurrentUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/accounts")
@PreAuthorize("hasRole('USER')")
@RequiredArgsConstructor
public class AccountController {
	private final AccountService accountService;

	@GetMapping
	public ApiResponse.Success<List<AccountDetail>> getAccounts(@RequestParam(required = false) UUID ledgerId,
																@RequestParam(defaultValue = "false") boolean includeArchived,
																@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(accountService.getAccounts(ledgerId, includeArchived, me.id()));
	}

	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	public ApiResponse.Success<AccountDetail> createAccount(@Valid @RequestBody AccountCreateRequest request,
															@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(accountService.createAccount(request, me.id()));
	}

	@GetMapping("/{id}")
	public ApiResponse.Success<AccountDetail> getAccount(@PathVariable("id") UUID accountId,
														@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(accountService.getAccount(accountId, me.id()));
	}

	@PatchMapping("/{id}")
	public ApiResponse.Success<AccountDetail> updateAccount(@PathVariable("id") UUID accountId,
															@Valid @RequestBody AccountUpdateRequest request,
															@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(accountService.updateAccount(accountId, request, me.id()));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void deleteAccount(@PathVariable("id") UUID accountId,
							@AuthenticationPrincipal CurrentUser me) {
		accountService.deleteAccount(accountId, me.id());
	}

	@PutMapping("/{id}/ledgers/{ledgerId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void linkAccount(@PathVariable("id") UUID accountId,
						@PathVariable UUID ledgerId,
						@AuthenticationPrincipal CurrentUser me) {
		accountService.linkAccount(accountId, ledgerId, me.id());
	}

	@DeleteMapping("/{id}/ledgers/{ledgerId}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	public void unlinkAccount(@PathVariable("id") UUID accountId,
						@PathVariable UUID ledgerId,
						@AuthenticationPrincipal CurrentUser me) {
		accountService.unlinkAccount(accountId, ledgerId, me.id());
	}

	@GetMapping("/{id}/balance")
	public ApiResponse.Success<AccountBalanceResponse> getBalance(@PathVariable("id") UUID accountId,
																@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(accountService.getBalance(accountId, me.id()));
	}
}
