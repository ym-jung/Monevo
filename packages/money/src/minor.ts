declare const brand: unique symbol;

export type Minor = bigint & { readonly [brand]: "Minor" };

export function toMinor(value: string | number | bigint): Minor {
	if (typeof value === "number" && !Number.isSafeInteger(value)) {
		throw new RangeError(`not a safe integer: ${value}`);
	}
	return BigInt(value) as Minor;
}


export function minorToNumber(value: Minor): number {
	const asNumber = Number(value);
	if (!Number.isSafeInteger(asNumber)) {
		throw new RangeError(`minor amount exceeds the safe integer range: ${value}`);
	}
	return asNumber;
}
