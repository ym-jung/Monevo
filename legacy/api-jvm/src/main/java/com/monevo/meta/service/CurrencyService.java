package com.monevo.meta.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.monevo.common.error.ErrorCode;
import com.monevo.common.error.types.ValidationException;
import com.monevo.meta.dto.CurrencyMeta;
import com.monevo.meta.entity.Currency;
import com.monevo.meta.repository.CurrencyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class CurrencyService {

	private static final String ACTIVE_LIST_KEY = "ACTIVE";

	private final CurrencyRepository currencyRepository;
	private final Cache<String, CurrencyMeta> metaCache;
	private final Cache<String, List<CurrencyMeta>> activeCache;

	public CurrencyService(CurrencyRepository currencyRepository) {
		this.currencyRepository = currencyRepository;
		this.metaCache = Caffeine.newBuilder()
			.maximumSize(100)
			.build();
		this.activeCache = Caffeine.newBuilder()
			.maximumSize(1)
			.build();
	}

	@Transactional(readOnly = true)
	public List<CurrencyMeta> listActive() {
		return activeCache.get(ACTIVE_LIST_KEY, key -> loadActive());
	}

	@Transactional(readOnly = true)
	public CurrencyMeta require(String code) {
		if (code == null) {
			throw new ValidationException(ErrorCode.CURRENCY_NOT_SUPPORTED, "Unknown currency: null");
		}
		return metaCache.get(code, this::load);
	}

	public int exponentOf(String code) {
		return require(code).minorUnitExponent();
	}

	private List<CurrencyMeta> loadActive() {
		List<CurrencyMeta> active = new ArrayList<>();
		for (Currency currency : currencyRepository.findAll()) {
			if (currency.isActive()) {
				active.add(toMeta(currency));
			}
		}
		active.sort(Comparator.comparing(CurrencyMeta::sortOrder).thenComparing(CurrencyMeta::code));
		return active;
	}

	private CurrencyMeta load(String code) {
		return currencyRepository.findById(code)
			.map(CurrencyService::toMeta)
			.orElseThrow(() -> new ValidationException(ErrorCode.CURRENCY_NOT_SUPPORTED,
				"Unknown currency: " + code));
	}

	private static CurrencyMeta toMeta(Currency currency) {
		return new CurrencyMeta(currency.getCode(), currency.getNameKo(), currency.getNameJa(),
			currency.getNameEn(), currency.getSymbol(), currency.getMinorUnitExponent(),
			currency.getSortOrder());
	}
}
