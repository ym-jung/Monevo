export interface Decimal {
	unscaled: bigint;
	scale: number;
}

const DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;

export function parseDecimal(value: string): Decimal {
	const trimmed = value.trim();
	if (!DECIMAL_PATTERN.test(trimmed)) {
		throw new RangeError(`not a decimal: ${value}`);
	}

	const dot = trimmed.indexOf(".");
	if (dot < 0) return { unscaled: BigInt(trimmed), scale: 0 };

	const digits = trimmed.slice(0, dot) + trimmed.slice(dot + 1);
	return { unscaled: BigInt(digits), scale: trimmed.length - dot - 1 };
}

export function pow10(exponent: number): bigint {
	return 10n ** BigInt(exponent);
}

export function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
	const quotient = numerator / denominator;
	const remainder = numerator % denominator;
	if (remainder === 0n) return quotient;

	const twiceRemainder = remainder < 0n ? -remainder * 2n : remainder * 2n;
	if (twiceRemainder < denominator) return quotient;

	return numerator < 0n ? quotient - 1n : quotient + 1n;
}

export function toPlainString(unscaled: bigint, scale: number): string {
	if (scale === 0) return unscaled.toString();

	const negative = unscaled < 0n;
	const digits = (negative ? -unscaled : unscaled).toString().padStart(scale + 1, "0");
	const whole = digits.slice(0, digits.length - scale);
	const fraction = digits.slice(digits.length - scale);

	return `${negative ? "-" : ""}${whole}.${fraction}`;
}
