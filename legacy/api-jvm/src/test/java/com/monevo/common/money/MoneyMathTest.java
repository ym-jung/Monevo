package com.monevo.common.money;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MoneyMathTest {
	@Test
	@DisplayName("$12.00 -> JPY @150 = ¥1,800")
	void usdToJpy() {
		assertThat(MoneyMath.convert(1200, 2, 0, new BigDecimal("150"))).isEqualTo(1800);
	}

	@Test
	@DisplayName("¥1,200 -> USD @0.00666667 = $8.00")
	void jpyToUsd() {
		assertThat(MoneyMath.convert(1200, 0, 2, new BigDecimal("0.00666667"))).isEqualTo(800);
	}

	@Test
	@DisplayName("¥1,200 -> KRW @9.5 = 11,400 (지수가 같으면 배율만)")
	void jpyToKrw() {
		assertThat(MoneyMath.convert(1200, 0, 0, new BigDecimal("9.5"))).isEqualTo(11400);
	}

	@Test
	@DisplayName("¥1 -> USD @0.0066 = 0.66 -> MAX(1, ..)로 1. 소액 거래가 0이 되어 사라지면 안 된다")
	void neverRoundsAwayToZero() {
		assertThat(MoneyMath.convert(1, 0, 2, new BigDecimal("0.0066"))).isEqualTo(1);
	}

	@Test
	@DisplayName("같은 통화 rate=1이면 그대로")
	void sameCurrency() {
		assertThat(MoneyMath.convert(12345, 0, 0, BigDecimal.ONE)).isEqualTo(12345);
	}

	@Test
	@DisplayName("0원은 0. MAX(1,..) 보정은 원금이 있을 때만 건다")
	void zeroStaysZero() {
		assertThat(MoneyMath.convert(0, 2, 0, new BigDecimal("150"))).isEqualTo(0);
	}

	@Test
	@DisplayName("HALF_UP - .5는 올린다")
	void roundsHalfUp() {

		assertThat(MoneyMath.convert(1, 0, 0, new BigDecimal("2.5"))).isEqualTo(3);
	}

	@Test
	@DisplayName("음수 금액은 거부. 방향은 transaction.type이 정한다 (INV-02)")
	void rejectsNegativeAmount() {
		assertThatThrownBy(() -> MoneyMath.convert(-1, 0, 0, BigDecimal.ONE))
			.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	@DisplayName("환율 0 이하는 거부 (ck_txn_fx_rate와 같은 규칙)")
	void rejectsNonPositiveRate() {
		assertThatThrownBy(() -> MoneyMath.convert(100, 0, 0, BigDecimal.ZERO))
			.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	@DisplayName("a split adds back up to the total it was carved from")
	void allocateKeepsTheTotal() {
		long[] parts = MoneyMath.allocate(1000, new long[]{333, 333, 334});

		assertThat(parts).hasSize(3);
		assertThat(parts[0] + parts[1] + parts[2]).isEqualTo(1000);
	}

	@Test
	@DisplayName("the leftover goes to the biggest remainder, not the first line")
	void allocateHandsLeftoverToTheBiggestRemainder() {
		assertThat(MoneyMath.allocate(10, new long[]{1, 1, 1})).containsExactly(4, 3, 3);

		assertThat(MoneyMath.allocate(100, new long[]{1, 2, 6})).containsExactly(11, 22, 67);
	}

	@Test
	@DisplayName("no part comes back zero - ck_line_amount would reject it")
	void allocateNeverProducesAZeroPart() {
		long[] parts = MoneyMath.allocate(3, new long[]{1, 1, 1_000_000});

		assertThat(parts).containsExactly(1, 1, 1);
	}

	@Test
	@DisplayName("a total too small to go round is rejected, not silently rounded away")
	void allocateRefusesAnImpossibleSplit() {
		assertThatThrownBy(() -> MoneyMath.allocate(2, new long[]{1, 1, 1}))
			.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	@DisplayName("converting once then splitting beats converting each line")
	void allocateAvoidsTheRoundingDriftOfPerLineConversion() {
		BigDecimal rate = new BigDecimal("150");
		long total = MoneyMath.convert(2000, 2, 0, rate);
		long[] parts = MoneyMath.allocate(total, new long[]{1200, 800});

		assertThat(parts[0] + parts[1]).isEqualTo(total);
		assertThat(total).isEqualTo(3000);
	}

	@Test
	@DisplayName("equal remainders are broken by index, so the same split always lands the same way")
	void allocateBreaksRemainderTiesByIndex() {
		long[] first = MoneyMath.allocate(10, new long[]{1, 1, 1});
		long[] second = MoneyMath.allocate(10, new long[]{1, 1, 1});

		assertThat(first).containsExactly(4, 3, 3);
		assertThat(second).containsExactly(first[0], first[1], first[2]);
	}

	@Test
	@DisplayName("a part rescued from zero is paid for by the largest part, not the first one")
	void allocateTakesTheRescuedUnitFromTheLargestPart() {
		long[] parts = MoneyMath.allocate(3, new long[]{1, 1_000_000, 1});

		assertThat(parts).containsExactly(1, 1, 1);
	}

	@Test
	@DisplayName("the exponent shift is applied to the converted amount, not to the rate")
	void convertAppliesTheExponentShiftAfterTheRate() {
		assertThat(MoneyMath.convert(67, 2, 0, new BigDecimal("149.25373134"))).isEqualTo(100);
		assertThat(MoneyMath.convert(10000, 2, 0, new BigDecimal("150"))).isEqualTo(15000);
	}
}
