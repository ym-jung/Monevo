package com.monevo.meta.dto;

public record CurrencyMeta(
	String code,
	String nameKo,
	String nameJa,
	String nameEn,
	String symbol,
	short minorUnitExponent,
	short sortOrder) {
}
