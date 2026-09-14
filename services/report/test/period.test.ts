import { describe, expect, it } from "vitest";

import { BusinessError } from "@monevo/http";

import { bucketStarts, normalizedIds, parseMonth, validatePeriod } from "../src/domain/period.ts";

describe("parseMonth", () => {
	it("spans the whole month", () => {
		expect(parseMonth("2026-08")).toEqual({ month: "2026-08", from: "2026-08-01", to: "2026-08-31" });
	});

	it("ends February on the 28th in a common year", () => {
		expect(parseMonth("2026-02").to).toBe("2026-02-28");
	});

	it("ends February on the 29th in a leap year", () => {
		expect(parseMonth("2028-02").to).toBe("2028-02-29");
	});

	it.each(["2026-13", "2026-00", "2026-8", "not-a-month", ""])("rejects %s", (value) => {
		expect(() => parseMonth(value)).toThrow(BusinessError);
	});
});

describe("validatePeriod", () => {
	it("accepts a period ending on the same day it starts", () => {
		expect(() => validatePeriod("2026-08-05", "2026-08-05")).not.toThrow();
	});

	it("rejects from after to", () => {
		expect(() => validatePeriod("2026-08-06", "2026-08-05")).toThrow(BusinessError);
	});

	it("accepts exactly 366 days", () => {
		expect(() => validatePeriod("2026-01-01", "2027-01-01")).not.toThrow();
	});

	it("rejects 367 days", () => {
		expect(() => validatePeriod("2026-01-01", "2027-01-02")).toThrow(BusinessError);
	});
});

describe("normalizedIds", () => {
	it("drops duplicates and keeps the first occurrence order", () => {
		expect(normalizedIds(["b", "a", "b"], "accountId")).toEqual(["b", "a"]);
	});

	it("returns an empty list for undefined", () => {
		expect(normalizedIds(undefined, "accountId")).toEqual([]);
	});

	it("accepts exactly 50 values", () => {
		const ids = Array.from({ length: 50 }, (_, index) => String(index));

		expect(normalizedIds(ids, "accountId")).toHaveLength(50);
	});

	it("rejects 51 values", () => {
		const ids = Array.from({ length: 51 }, (_, index) => String(index));

		expect(() => normalizedIds(ids, "accountId")).toThrow(BusinessError);
	});
});

describe("bucketStarts", () => {
	it("fills every day in the range", () => {
		expect(bucketStarts("2026-08-30", "2026-09-02", "DAY")).toEqual([
			"2026-08-30",
			"2026-08-31",
			"2026-09-01",
			"2026-09-02",
		]);
	});

	it("fills every month start in the range", () => {
		expect(bucketStarts("2026-11-15", "2027-02-03", "MONTH")).toEqual([
			"2026-11-01",
			"2026-12-01",
			"2027-01-01",
			"2027-02-01",
		]);
	});

	it("crosses a leap day", () => {
		expect(bucketStarts("2028-02-28", "2028-03-01", "DAY")).toEqual([
			"2028-02-28",
			"2028-02-29",
			"2028-03-01",
		]);
	});
});
