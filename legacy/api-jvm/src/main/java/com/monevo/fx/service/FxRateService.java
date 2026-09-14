package com.monevo.fx.service;

import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ExternalServiceException;
import com.monevo.common.error.types.ValidationException;
import com.monevo.fx.client.FxQuote;
import com.monevo.fx.client.FxServiceClient;
import com.monevo.fx.entity.FxRate;
import com.monevo.fx.repository.FxRateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FxRateService {
	private final FxRateRepository fxRateRepository;
	private final FxServiceClient fxServiceClient;

	public Optional<FxQuote> resolve(String base, String quote, LocalDate date) {
		if (base.equals(quote)) {
			log.info("FX - base and quote are same");
			throw new ValidationException(ErrorCode.FX_RATE_INVALID, "Input was same currency.");
		}

		if (date != null) {
			Optional<FxRate> cached = fxRateRepository.findByBaseAndQuoteAndRateDate(base, quote, date);
			if (cached.isPresent()) {
				return Optional.of(FxQuote.from(cached.get()));
			}
		}

		LocalDate rateDate = (date != null) ? date : LocalDate.now(ZoneOffset.UTC);

		try {
			Optional<FxQuote> fetched = fxServiceClient.fetch(base, quote, date);
			fetched.ifPresent(quoteData -> save(base, quote, rateDate, quoteData));
			return fetched;
		} catch (ExternalServiceException ex) {

			return fxRateRepository
				.findFirstByBaseAndQuoteAndRateDateLessThanEqualOrderByRateDateDesc(base, quote, rateDate)
				.map(FxQuote::from);
		}
	}

	private void save(String base, String quote, LocalDate rateDate, FxQuote fxQuote) {
		try {
			fxRateRepository.save(FxRate.of(base, quote, rateDate, fxQuote.asOf(), fxQuote.rate(), fxQuote.source()));
		} catch (DataIntegrityViolationException e) {
			log.info("Other transaction saved this FX rate already: {}/{}", base, quote);
		}
	}
}
