package com.monevo.fx.entity;

import java.io.Serializable;
import java.time.LocalDate;

public record FxRateId(String base, String quote, LocalDate rateDate) implements Serializable {

	public FxRateId() {
		this(null, null, null);
	}
}
