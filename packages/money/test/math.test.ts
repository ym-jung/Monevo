import { describe, expect, it } from "vitest";

import { allocate, convert, format, sameCurrency } from "../src/math.ts";
import { toMinor } from "../src/minor.ts";

const m = toMinor;
const ms = (values: number[]) => values.map(m);
const plain = (parts: bigint[]) => parts.map((part) => Number(part));

describe("convert", () => {
	it("$12.00 -> JPY @150 = ¥1,800", () => {
		expect(convert(m(1200), 2, 0, "150")).toBe(1800n);
	});

	it("¥1,200 -> USD @0.00666667 = $8.00", () => {
		expect(convert(m(1200), 0, 2, "0.00666667")).toBe(800n);
	});

	it("¥1,200 -> KRW @9.5 = 11,400 when the exponents match", () => {
		expect(convert(m(1200), 0, 0, "9.5")).toBe(11400n);
	});

	it("never rounds a small amount away to zero", () => {
		expect(convert(m(1), 0, 2, "0.0066")).toBe(1n);
	});

	it("leaves the amount alone at rate 1 in the same currency", () => {
		expect(convert(m(12345), 0, 0, "1")).toBe(12345n);
	});

	it("keeps zero at zero - the rescue only applies to a non-zero amount", () => {
		expect(convert(m(0), 2, 0, "150")).toBe(0n);
	});

	it("rounds half up", () => {
		expect(convert(m(1), 0, 0, "2.5")).toBe(3n);
	});

	it("rejects a negative amount", () => {
		expect(() => convert(m(-1), 0, 0, "1")).toThrow(RangeError);
	});

	it("rejects a non-positive rate", () => {
		expect(() => convert(m(100), 0, 0, "0")).toThrow(RangeError);
	});

	it("applies the exponent shift to the converted amount, not to the rate", () => {
		expect(convert(m(67), 2, 0, "149.25373134")).toBe(100n);
		expect(convert(m(10000), 2, 0, "150")).toBe(15000n);
	});
});

describe("sameCurrency", () => {
	it("passes the amount through", () => {
		expect(sameCurrency(m(12345))).toBe(12345n);
	});
});

describe("allocate", () => {
	it("adds back up to the total it was carved from", () => {
		const parts = allocate(m(1000), ms([333, 333, 334]));

		expect(parts).toHaveLength(3);
		expect(parts[0]! + parts[1]! + parts[2]!).toBe(1000n);
	});

	it("hands the leftover to the biggest remainder, not the first line", () => {
		expect(plain(allocate(m(10), ms([1, 1, 1])))).toEqual([4, 3, 3]);
		expect(plain(allocate(m(100), ms([1, 2, 6])))).toEqual([11, 22, 67]);
	});

	it("never produces a zero part - ck_line_amount would reject it", () => {
		expect(plain(allocate(m(3), ms([1, 1, 1_000_000])))).toEqual([1, 1, 1]);
	});

	it("refuses an impossible split instead of silently rounding it away", () => {
		expect(() => allocate(m(2), ms([1, 1, 1]))).toThrow(RangeError);
	});

	it("rejects a non-positive weight", () => {
		expect(() => allocate(m(10), ms([1, 0, 1]))).toThrow(RangeError);
	});

	it("rejects an empty weight list", () => {
		expect(() => allocate(m(10), [])).toThrow(RangeError);
	});

	it("converting once then splitting beats converting each line", () => {
		const total = convert(m(2000), 2, 0, "150");
		const parts = allocate(total, ms([1200, 800]));

		expect(parts[0]! + parts[1]!).toBe(total);
		expect(total).toBe(3000n);
	});

	it("breaks equal remainders by index, so the same split always lands the same way", () => {
		const first = allocate(m(10), ms([1, 1, 1]));
		const second = allocate(m(10), ms([1, 1, 1]));

		expect(plain(first)).toEqual([4, 3, 3]);
		expect(plain(second)).toEqual(plain(first));
	});

	it("pays for a part rescued from zero out of the largest part, not the first one", () => {
		expect(plain(allocate(m(3), ms([1, 1_000_000, 1])))).toEqual([1, 1, 1]);
	});
});

describe("format", () => {
	it("renders a zero-exponent currency without a decimal point", () => {
		expect(format(m(12000), 0)).toBe("12000");
	});

	it("renders a two-exponent currency with both decimals", () => {
		expect(format(m(1200), 2)).toBe("12.00");
	});

	it("pads an amount smaller than one major unit", () => {
		expect(format(m(5), 2)).toBe("0.05");
	});

	it("keeps the sign in front", () => {
		expect(format(m(-5), 2)).toBe("-0.05");
	});
});
