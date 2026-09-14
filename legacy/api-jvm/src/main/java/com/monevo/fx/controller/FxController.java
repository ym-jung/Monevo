package com.monevo.fx.controller;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ExternalServiceException;
import com.monevo.common.response.ApiResponse;
import com.monevo.fx.dto.FxRateResponse;
import com.monevo.fx.service.FxRateService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/fx")
@PreAuthorize("hasRole('USER')")
@RequiredArgsConstructor
public class FxController {
	private final FxRateService fxRateService;

	@GetMapping("/rate")
	public ApiResponse.Success<FxRateResponse> getRate(@RequestParam String base,
													@RequestParam String quote,
													@RequestParam(required = false)
													@DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return ApiResponse.ok(fxRateService.resolve(base, quote, date)
			.map(fxQuote -> FxRateResponse.from(base, quote, fxQuote))
			.orElseThrow(() -> new ExternalServiceException(ErrorCode.FX_RATE_UNAVAILABLE,
				"No rate for " + base + "/" + quote)));
	}
}
