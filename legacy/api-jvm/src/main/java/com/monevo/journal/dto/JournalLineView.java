package com.monevo.journal.dto;

import com.monevo.journal.entity.FxRateSource;
import com.monevo.journal.entity.JournalLine;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.UUID;

public record JournalLineView(
	UUID id,
	short lineNo,
	JournalLine.Side side,
	AccountRef account,
	long amountMinor,
	String currency,
	long baseAmountMinor,
	String fxRate,
	FxRateSource fxRateSource,
	LocalDate fxRateAsOf,
	String memo
) {
	private static final int FX_RATE_SCALE = 8;

	public static JournalLineView from(JournalLine line, AccountRef account) {
		return new JournalLineView(
			line.getId(),
			line.getLineNo(),
			line.getSide(),
			account,
			line.getAmountMinor(),
			line.getCurrency(),
			line.getBaseAmountMinor(),
			line.getFxRate().setScale(FX_RATE_SCALE, RoundingMode.HALF_UP).toPlainString(),
			line.getFxRateSource(),
			line.getFxRateAsOf(),
			line.getMemo()
		);
	}
}
