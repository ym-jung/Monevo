package com.monevo.journal.entity;

import com.monevo.common.entity.UserMeta;
import com.monevo.common.util.UuidV7;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "journal_line")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class JournalLine extends UserMeta {
	public enum Side {
		DEBIT, CREDIT
	}

	@Id
	@Column(name = "id")
	private UUID id;

	@Column(name = "entry_id", nullable = false, updatable = false)
	private UUID entryId;

	@Column(name = "line_no", nullable = false)
	private short lineNo;

	@Enumerated(EnumType.STRING)
	@Column(name = "side", nullable = false, length = 6)
	private Side side;

	@Column(name = "account_id", nullable = false)
	private UUID accountId;

	@JdbcTypeCode(SqlTypes.CHAR)
	@Column(name = "currency", nullable = false, length = 3)
	private String currency;

	@Column(name = "amount_minor", nullable = false)
	private long amountMinor;

	@Column(name = "fx_rate", nullable = false, precision = 18, scale = 8)
	private BigDecimal fxRate;

	@Column(name = "base_amount_minor", nullable = false)
	private long baseAmountMinor;

	@Enumerated(EnumType.STRING)
	@Column(name = "fx_rate_source", nullable = false, length = 15)
	private FxRateSource fxRateSource;

	@Column(name = "fx_rate_as_of")
	private LocalDate fxRateAsOf;

	@Column(name = "memo", columnDefinition = "text")
	private String memo;

	private JournalLine(UUID entryId, short lineNo, Side side, UUID accountId, String currency,
						long amountMinor, BigDecimal fxRate, long baseAmountMinor,
						FxRateSource fxRateSource, LocalDate fxRateAsOf, String memo) {
		this.id = UuidV7.generate();
		this.entryId = entryId;
		this.lineNo = lineNo;
		this.side = side;
		this.accountId = accountId;
		this.currency = currency;
		this.amountMinor = amountMinor;
		this.fxRate = fxRate;
		this.baseAmountMinor = baseAmountMinor;
		this.fxRateSource = fxRateSource;
		this.fxRateAsOf = fxRateAsOf;
		this.memo = memo;
	}

	public static JournalLine of(UUID entryId, short lineNo, Side side, UUID accountId, String currency,
								long amountMinor, BigDecimal fxRate, long baseAmountMinor,
								FxRateSource fxRateSource, LocalDate fxRateAsOf, String memo) {
		return new JournalLine(entryId, lineNo, side, accountId, currency, amountMinor,
			fxRate, baseAmountMinor, fxRateSource, fxRateAsOf, memo);
	}

	public boolean isDebit() {
		return side == Side.DEBIT;
	}

	public long signedAmount() {
		return isDebit() ? amountMinor : -amountMinor;
	}

	public long signedBaseAmount() {
		return isDebit() ? baseAmountMinor : -baseAmountMinor;
	}
}
