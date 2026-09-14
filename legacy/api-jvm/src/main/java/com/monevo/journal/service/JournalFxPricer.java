package com.monevo.journal.service;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ExternalServiceException;
import com.monevo.common.error.types.ValidationException;
import com.monevo.common.money.MoneyMath;
import com.monevo.fx.client.FxQuote;
import com.monevo.fx.service.FxRateService;
import com.monevo.journal.entity.FxRateSource;
import com.monevo.journal.entity.JournalLine;
import com.monevo.meta.service.CurrencyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JournalFxPricer {
	private static final int FX_RATE_SCALE = 8;
	private static final BigDecimal SMALLEST_RATE = BigDecimal.valueOf(1, FX_RATE_SCALE);

	private final FxRateService fxRateService;
	private final CurrencyService currencyService;

	public record LineRequest(
		JournalLine.Side side,
		UUID accountId,
		String currency,
		long amountMinor,
		BigDecimal requestedRate,
		String memo
	) {
	}

	public record PricedLine(
		JournalLine.Side side,
		UUID accountId,
		String currency,
		long amountMinor,
		BigDecimal fxRate,
		long baseAmountMinor,
		FxRateSource source,
		LocalDate asOf,
		String memo
	) {
	}

	public List<PricedLine> price(List<LineRequest> requests, String baseCurrency, LocalDate entryDate) {
		List<PricedLine> priced = new ArrayList<>(requests.size());
		for (LineRequest request : requests) {
			priced.add(convert(request, baseCurrency, entryDate));
		}
		return balance(priced, baseCurrency);
	}

	private PricedLine convert(LineRequest request, String baseCurrency, LocalDate entryDate) {
		if (request.currency().equals(baseCurrency)) {
			return new PricedLine(request.side(), request.accountId(), request.currency(), request.amountMinor(),
				BigDecimal.ONE, request.amountMinor(), FxRateSource.SAME_CURRENCY, null, request.memo());
		}

		if (request.requestedRate() != null) {
			if (request.requestedRate().compareTo(BigDecimal.ZERO) <= 0) {
				throw new ValidationException(ErrorCode.FX_RATE_INVALID, "fxRate must be positive");
			}
			return build(request, baseCurrency, request.requestedRate(), FxRateSource.MANUAL, entryDate);
		}

		Optional<FxQuote> quote = fxRateService.resolve(baseCurrency, request.currency(), entryDate);
		if (quote.isEmpty()) {
			log.info("No rate for {}/{} on {}", baseCurrency, request.currency(), entryDate);
			throw new ExternalServiceException(ErrorCode.FX_RATE_UNAVAILABLE,
				"No rate for " + baseCurrency + "/" + request.currency() + ", resend with fxRate");
		}

		FxQuote fxQuote = quote.get();
		return build(request, baseCurrency, fxQuote.rate(), FxRateSource.FX_SERVICE, fxQuote.asOf());
	}

	private PricedLine build(LineRequest request, String baseCurrency, BigDecimal rate,
							FxRateSource source, LocalDate asOf) {
		long baseAmountMinor = MoneyMath.convert(request.amountMinor(),
			currencyService.exponentOf(request.currency()),
			currencyService.exponentOf(baseCurrency),
			rate);
		return new PricedLine(request.side(), request.accountId(), request.currency(), request.amountMinor(),
			rate, baseAmountMinor, source, asOf, request.memo());
	}

	private List<PricedLine> balance(List<PricedLine> lines, String baseCurrency) {
		long debitTotal = sideTotal(lines, JournalLine.Side.DEBIT);
		long creditTotal = sideTotal(lines, JournalLine.Side.CREDIT);
		if (debitTotal == creditTotal) {
			return lines;
		}

		JournalLine.Side anchor = anchorSide(lines, baseCurrency);
		long anchoredTotal = anchor == JournalLine.Side.DEBIT ? debitTotal : creditTotal;
		List<Integer> targets = indicesOnSide(lines, opposite(anchor));
		long[] shares = shareOut(lines, targets, anchoredTotal);

		return rewriteToShares(lines, targets, shares, baseCurrency, Math.abs(debitTotal - creditTotal));
	}

	private static JournalLine.Side opposite(JournalLine.Side side) {
		return side == JournalLine.Side.DEBIT ? JournalLine.Side.CREDIT : JournalLine.Side.DEBIT;
	}

	private static List<Integer> indicesOnSide(List<PricedLine> lines, JournalLine.Side side) {
		List<Integer> indices = new ArrayList<>();
		for (int i = 0; i < lines.size(); i++) {
			if (lines.get(i).side() == side) {
				indices.add(i);
			}
		}
		return indices;
	}

	private static long[] shareOut(List<PricedLine> lines, List<Integer> targets, long anchoredTotal) {
		long[] weights = new long[targets.size()];
		for (int i = 0; i < targets.size(); i++) {
			weights[i] = lines.get(targets.get(i)).baseAmountMinor();
		}
		try {
			return MoneyMath.allocate(anchoredTotal, weights);
		} catch (IllegalArgumentException ex) {
			throw new ValidationException(ErrorCode.JOURNAL_ENTRY_UNBALANCED,
				"the amounts are too small to split across " + weights.length + " lines");
		}
	}

	private List<PricedLine> rewriteToShares(List<PricedLine> lines, List<Integer> targets, long[] shares,
											String baseCurrency, long drift) {
		List<PricedLine> result = new ArrayList<>(lines);
		for (int i = 0; i < targets.size(); i++) {
			int index = targets.get(i);
			PricedLine line = lines.get(index);
			if (line.baseAmountMinor() == shares[i]) {
				continue;
			}
			if (line.currency().equals(baseCurrency)) {
				throw new ValidationException(ErrorCode.JOURNAL_ENTRY_UNBALANCED,
					"debits and credits differ by " + drift + " " + baseCurrency);
			}
			result.set(index, new PricedLine(line.side(), line.accountId(), line.currency(), line.amountMinor(),
				deriveRate(line.amountMinor(), shares[i], line.currency(), baseCurrency),
				shares[i], FxRateSource.DERIVED, null, line.memo()));
		}
		return result;
	}

	private static long sideTotal(List<PricedLine> lines, JournalLine.Side side) {
		long total = 0;
		for (PricedLine line : lines) {
			if (line.side() == side) {
				total += line.baseAmountMinor();
			}
		}
		return total;
	}

	private static JournalLine.Side anchorSide(List<PricedLine> lines, String baseCurrency) {
		boolean debitPinned = allInBaseCurrency(lines, JournalLine.Side.DEBIT, baseCurrency);
		boolean creditPinned = allInBaseCurrency(lines, JournalLine.Side.CREDIT, baseCurrency);
		if (debitPinned && !creditPinned) {
			return JournalLine.Side.DEBIT;
		}
		return JournalLine.Side.CREDIT;
	}

	private static boolean allInBaseCurrency(List<PricedLine> lines, JournalLine.Side side, String baseCurrency) {
		boolean seen = false;
		for (PricedLine line : lines) {
			if (line.side() != side) {
				continue;
			}
			seen = true;
			if (!line.currency().equals(baseCurrency)) {
				return false;
			}
		}
		return seen;
	}

	private BigDecimal deriveRate(long amountMinor, long baseAmountMinor, String currency, String baseCurrency) {
		int diff = currencyService.exponentOf(currency) - currencyService.exponentOf(baseCurrency);
		BigDecimal numerator = BigDecimal.valueOf(baseAmountMinor);
		if (diff > 0) {
			numerator = numerator.multiply(BigDecimal.TEN.pow(diff));
		} else if (diff < 0) {
			numerator = numerator.divide(BigDecimal.TEN.pow(-diff), FX_RATE_SCALE + 4, RoundingMode.HALF_UP);
		}
		BigDecimal rate = numerator.divide(BigDecimal.valueOf(amountMinor), FX_RATE_SCALE, RoundingMode.HALF_UP);
		return rate.compareTo(BigDecimal.ZERO) > 0 ? rate : SMALLEST_RATE;
	}
}
