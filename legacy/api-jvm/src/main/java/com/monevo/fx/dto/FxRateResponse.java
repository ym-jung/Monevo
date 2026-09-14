package com.monevo.fx.dto;

import com.monevo.fx.client.FxQuote;

import java.time.LocalDate;

public record FxRateResponse(
	String base,
	String quote,
	String rate,
	LocalDate asOf,
	String source
) {
	public static FxRateResponse from(String base, String quote, FxQuote fxQuote) {
		return new FxRateResponse(
			base,
			quote,
			fxQuote.rate().toPlainString(),
			fxQuote.asOf(),
			fxQuote.source()
		);
	}
}
