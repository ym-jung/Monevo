import { divideHalfUp, parseDecimal, pow10, toPlainString } from "./decimal.ts";
import type { Minor } from "./minor.ts";

const RESCALE_SCALE = 10;

export function convert(amount: Minor, fromExponent: number, toExponent: number, rate: string): Minor {
	if (amount < 0n) {
		throw new RangeError("Amount must not be negative");
	}

	const fxRate = parseDecimal(rate);
	if (fxRate.unscaled <= 0n) {
		throw new RangeError("FxRate must be positive");
	}

	let unscaled = amount * fxRate.unscaled;
	let scale = fxRate.scale;

	const exponentShift = toExponent - fromExponent;
	if (exponentShift > 0) {
		unscaled *= pow10(exponentShift);
	} else if (exponentShift < 0) {
		const widening = RESCALE_SCALE - scale + exponentShift;
		unscaled = widening >= 0 ? unscaled * pow10(widening) : divideHalfUp(unscaled, pow10(-widening));
		scale = RESCALE_SCALE;
	}

	const rounded = divideHalfUp(unscaled, pow10(scale));
	const roundedAwayToNothing = amount > 0n && rounded === 0n;

	return (roundedAwayToNothing ? 1n : rounded) as Minor;
}

export function sameCurrency(amount: Minor): Minor {
	return convert(amount, 0, 0, "1");
}

export function format(amount: Minor, exponent: number): string {
	return toPlainString(amount, exponent);
}

export function allocate(total: Minor, weights: readonly Minor[]): Minor[] {
	if (weights.length === 0) {
		throw new RangeError("weights must not be empty");
	}
	if (total < BigInt(weights.length)) {
		throw new RangeError(`cannot split ${total} into ${weights.length} positive parts`);
	}

	const parts = distributeByLargestRemainder(total, weights);
	ensureNoZeroPart(parts);

	return parts as Minor[];
}

function distributeByLargestRemainder(total: bigint, weights: readonly bigint[]): bigint[] {
	let weightSum = 0n;
	for (const weight of weights) {
		if (weight <= 0n) {
			throw new RangeError("weights must be positive");
		}
		weightSum += weight;
	}

	const parts: bigint[] = [];
	const remainders: bigint[] = [];
	let assigned = 0n;

	for (const weight of weights) {
		const scaled = total * weight;
		const part = scaled / weightSum;
		parts.push(part);
		remainders.push(scaled % weightSum);
		assigned += part;
	}

	const neediest = indicesByDescendingRemainder(remainders);
	for (let i = 0; assigned < total; i++) {
		const target = neediest[i % parts.length]!;
		parts[target]! += 1n;
		assigned += 1n;
	}

	return parts;
}

function indicesByDescendingRemainder(remainders: readonly bigint[]): number[] {
	return remainders
		.map((_, index) => index)
		.sort((left, right) => {
			const leftRemainder = remainders[left]!;
			const rightRemainder = remainders[right]!;
			if (rightRemainder > leftRemainder) return 1;
			if (rightRemainder < leftRemainder) return -1;
			return left - right;
		});
}

function ensureNoZeroPart(parts: bigint[]): void {
	for (let i = 0; i < parts.length; i++) {
		if (parts[i]! > 0n) continue;

		let fattest = 0;
		for (let j = 1; j < parts.length; j++) {
			if (parts[j]! > parts[fattest]!) fattest = j;
		}

		parts[fattest]! -= 1n;
		parts[i]! += 1n;
	}
}
