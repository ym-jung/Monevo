package com.monevo.fx.client;

import com.monevo.fx.entity.FxRate;

import java.math.BigDecimal;
import java.time.LocalDate;

public record FxQuote(BigDecimal rate, LocalDate asOf, String source) {
	public static FxQuote from(FxRate fxRate) {
		return new FxQuote(
			fxRate.getRate(),
			fxRate.getAsOf(),
			fxRate.getSource()
		);
	}
}
