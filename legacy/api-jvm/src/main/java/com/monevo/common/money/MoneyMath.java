package com.monevo.common.money;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.RoundingMode;
import java.util.Arrays;

public final class MoneyMath {
	private static final int RESCALE_SCALE = 10;

	private MoneyMath() {
	}

	public static long convert(long amountMinor, int fromExponent, int toExponent, BigDecimal fxRate) {
		if (amountMinor < 0) {
			throw new IllegalArgumentException("Amount must not be negative");
		}
		if (fxRate.compareTo(BigDecimal.ZERO) <= 0) {
			throw new IllegalArgumentException("FxRate must be positive");
		}

		BigDecimal atSourceScale = BigDecimal.valueOf(amountMinor).multiply(fxRate);
		BigDecimal atTargetScale = shiftExponent(atSourceScale, toExponent - fromExponent);
		long rounded = atTargetScale.setScale(0, RoundingMode.HALF_UP).longValueExact();

		boolean roundedAwayToNothing = amountMinor > 0 && rounded == 0;
		return roundedAwayToNothing ? 1L : rounded;
	}

	public static long[] allocate(long totalBase, long[] weights) {
		if (weights == null || weights.length == 0) {
			throw new IllegalArgumentException("weights must not be empty");
		}
		if (totalBase < weights.length) {
			throw new IllegalArgumentException(
				"cannot split " + totalBase + " into " + weights.length + " positive parts");
		}

		long[] parts = distributeByLargestRemainder(totalBase, weights);
		ensureNoZeroPart(parts);
		return parts;
	}

	public static long sameCurrency(long amountMinor) {
		return convert(amountMinor, 0, 0, BigDecimal.ONE);
	}

	public static String format(long amountMinor, int exponent) {
		return BigDecimal.valueOf(amountMinor, exponent).toPlainString();
	}

	private static BigDecimal shiftExponent(BigDecimal value, int exponentShift) {
		if (exponentShift > 0) {
			return value.multiply(BigDecimal.TEN.pow(exponentShift));
		}
		if (exponentShift < 0) {
			return value.divide(BigDecimal.TEN.pow(-exponentShift), RESCALE_SCALE, RoundingMode.HALF_UP);
		}
		return value;
	}

	private static long[] distributeByLargestRemainder(long totalBase, long[] weights) {
		BigInteger total = BigInteger.valueOf(totalBase);
		BigInteger weightSum = BigInteger.ZERO;
		for (long weight : weights) {
			if (weight <= 0) {
				throw new IllegalArgumentException("weights must be positive");
			}
			weightSum = weightSum.add(BigInteger.valueOf(weight));
		}

		long[] parts = new long[weights.length];
		BigInteger[] remainders = new BigInteger[weights.length];
		long assigned = 0;
		for (int i = 0; i < weights.length; i++) {
			BigInteger[] divided = total.multiply(BigInteger.valueOf(weights[i])).divideAndRemainder(weightSum);
			parts[i] = divided[0].longValueExact();
			remainders[i] = divided[1];
			assigned += parts[i];
		}

		int[] neediest = indicesByDescendingRemainder(remainders);
		for (int i = 0; assigned < totalBase; i++) {
			parts[neediest[i % parts.length]]++;
			assigned++;
		}
		return parts;
	}

	private static int[] indicesByDescendingRemainder(BigInteger[] remainders) {
		Integer[] order = new Integer[remainders.length];
		for (int i = 0; i < order.length; i++) {
			order[i] = i;
		}
		Arrays.sort(order, (left, right) -> {
			int byRemainder = remainders[right].compareTo(remainders[left]);
			return byRemainder != 0 ? byRemainder : Integer.compare(left, right);
		});

		int[] indices = new int[order.length];
		for (int i = 0; i < indices.length; i++) {
			indices[i] = order[i];
		}
		return indices;
	}

	private static void ensureNoZeroPart(long[] parts) {
		for (int i = 0; i < parts.length; i++) {
			if (parts[i] > 0) {
				continue;
			}
			int fattest = 0;
			for (int j = 1; j < parts.length; j++) {
				if (parts[j] > parts[fattest]) {
					fattest = j;
				}
			}
			parts[fattest]--;
			parts[i]++;
		}
	}
}
