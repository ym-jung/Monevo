import { describe, expect, it } from "vitest";

import { fingerprint, plainDecimal } from "../src/domain/fingerprint.ts";

const LEDGER = "01a09aac-a8b1-7443-a567-e2c982ba1e91";
const DEBIT_ACCOUNT = "01a09aac-a8b1-7443-a567-e2cafba7c8a3";
const CREDIT_ACCOUNT = "01a09aac-a8b1-7443-a567-e2cafba7c8b4";

const request = {
	clientRequestId: null,
	ledgerId: LEDGER,
	entryDate: "2026-08-05",
	description: "점심 값 — lunch",
	memo: null,
	lines: [
		{
			side: "DEBIT" as const,
			accountId: DEBIT_ACCOUNT,
			amountMinor: 1200,
			currency: null,
			fxRate: null,
			memo: "with tax",
		},
		{
			side: "CREDIT" as const,
			accountId: CREDIT_ACCOUNT,
			amountMinor: 1200,
			currency: "JPY",
			fxRate: "150.12300000",
			memo: null,
		},
	],
};

describe("fingerprint", () => {
	it("matches the hash the JVM produces for the same request", () => {
		expect(fingerprint(request)).toBe(
			"81fd25c81f63839d8383ac5c87d7d0003e4687d1d155f9666d40c77e464a4a9f",
		);
	});

	it("is stable across calls", () => {
		expect(fingerprint(request)).toBe(fingerprint(request));
	});

	it("ignores clientRequestId", () => {
		expect(fingerprint({ ...request, clientRequestId: "01a09aac-0000-7000-8000-000000000001" })).toBe(
			fingerprint(request),
		);
	});

	it.each([
		["the description", { description: "dinner" }],
		["the entry date", { entryDate: "2026-08-06" }],
		["the memo", { memo: "added" }],
	])("changes when %s changes", (_case, patch) => {
		expect(fingerprint({ ...request, ...patch })).not.toBe(fingerprint(request));
	});

	it("changes when a line memo changes", () => {
		const lines = [{ ...request.lines[0]!, memo: "different" }, request.lines[1]!];

		expect(fingerprint({ ...request, lines })).not.toBe(fingerprint(request));
	});

	it("changes when the line order changes", () => {
		const lines = [request.lines[1]!, request.lines[0]!];

		expect(fingerprint({ ...request, lines })).not.toBe(fingerprint(request));
	});

	it("distinguishes an absent value from an empty one", () => {
		const absent = [{ ...request.lines[0]!, memo: null }, request.lines[1]!];
		const empty = [{ ...request.lines[0]!, memo: "" }, request.lines[1]!];

		expect(fingerprint({ ...request, lines: absent })).not.toBe(
			fingerprint({ ...request, lines: empty }),
		);
	});

	it("cannot be collided by moving characters between adjacent fields", () => {
		const left = { ...request, description: "ab", memo: "c" };
		const right = { ...request, description: "a", memo: "bc" };

		expect(fingerprint(left)).not.toBe(fingerprint(right));
	});
});

describe("plainDecimal", () => {
	it.each([
		["150.12300000", "150.123"],
		["150.00000000", "150"],
		["0.00000001", "0.00000001"],
		["1.0", "1"],
		["0.000", "0"],
		["-2.500", "-2.5"],
	])("renders %s as %s", (input, expected) => {
		expect(plainDecimal(input)).toBe(expected);
	});

	it("passes null through", () => {
		expect(plainDecimal(null)).toBeNull();
	});
});
