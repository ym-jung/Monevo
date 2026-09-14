package com.monevo.fx.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "fx_rate")
@IdClass(FxRateId.class)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FxRate {

	@Id
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "base", length = 3)
	private String base;

	@Id
	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "quote", length = 3)
	private String quote;

	@Id
	@Column(name = "rate_date")
	private LocalDate rateDate;

	@Column(name = "as_of", nullable = false)
	private LocalDate asOf;

	@Column(name = "rate", nullable = false, precision = 18, scale = 8)
	private BigDecimal rate;

	@Column(name = "source", nullable = false, length = 20)
	private String source;

	@Column(name = "fetched_at", insertable = false, updatable = false)
	private Instant fetchedAt;

	private FxRate(String base, String quote, LocalDate rateDate, LocalDate asOf, BigDecimal rate, String source) {
		this.base = base;
		this.quote = quote;
		this.rateDate = rateDate;
		this.asOf = asOf;
		this.rate = rate;
		this.source = source;
	}

	public static FxRate of(String base, String quote, LocalDate rateDate, LocalDate asOf,
							BigDecimal rate, String source) {
		return new FxRate(base, quote, rateDate, asOf, rate, source);
	}
}
