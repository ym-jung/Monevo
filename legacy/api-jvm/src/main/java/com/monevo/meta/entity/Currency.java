package com.monevo.meta.entity;

import jakarta.annotation.Nullable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "currency")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Currency {
	@Id
	@Column(name = "code", length = 3)
	@JdbcTypeCode(SqlTypes.CHAR)
	private String code;

	@Column(name = "name_ko", nullable = false, length = 50)
	private String nameKo;

	@Column(name = "name_ja", nullable = false, length = 50)
	private String nameJa;

	@Column(name = "name_en", nullable = false, length = 50)
	private String nameEn;

	@Column(name = "symbol", nullable = false, length = 8)
	private String symbol;

	@Column(name = "minor_unit_exponent", nullable = false)
	private short minorUnitExponent = 0;

	@Column(name = "yfinance_symbol_base", length = 20)
	private String yfinanceSymbolBase;

	@Column(name = "is_active", nullable = false)
	private boolean isActive = true;

	@Column(name = "sort_order", nullable = false)
	private short sortOrder = 0;

	public Currency(String code, String nameKo, String nameJa, String nameEn, String symbol, short minorUnitExponent, @Nullable String yfinanceSymbolBase, boolean isActive, short sortOrder) {
		this.code = code;
		this.nameKo = nameKo;
		this.nameJa = nameJa;
		this.nameEn = nameEn;
		this.symbol = symbol;
		this.minorUnitExponent = minorUnitExponent;
		this.yfinanceSymbolBase = yfinanceSymbolBase;
		this.isActive = isActive;
		this.sortOrder = sortOrder;
	}
}
