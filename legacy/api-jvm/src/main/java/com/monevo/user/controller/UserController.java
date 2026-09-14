package com.monevo.user.controller;

import com.monevo.common.response.ApiResponse;
import com.monevo.common.security.CurrentUser;
import com.monevo.meta.service.CurrencyService;
import com.monevo.user.dto.UpdateProfileRequest;
import com.monevo.user.dto.UserSummary;
import com.monevo.user.service.AppUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

	private final AppUserService appUserService;
	private final CurrencyService currencyService;

	@GetMapping("/me")
	public ApiResponse.Success<UserSummary> me(@AuthenticationPrincipal CurrentUser me) {
		return ApiResponse.ok(UserSummary.from(appUserService.require(me.id())));
	}

	@PatchMapping("/me")
	public ApiResponse.Success<UserSummary> updateMe(@AuthenticationPrincipal CurrentUser me,
													@Valid @RequestBody UpdateProfileRequest request) {
		if (request.displayCurrency() != null) {
			currencyService.require(request.displayCurrency());
		}
		return ApiResponse.ok(UserSummary.from(appUserService.updateProfile(me.id(), request.email(),
			request.displayName(), request.displayCurrency(), request.locale(), request.timezone())));
	}
}
