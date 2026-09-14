import { describe, expect, it } from "vitest";

import { parseEntryUpdate, requiredUuidQuery } from "../src/domain/requests.ts";

const LEDGER = "01a09e8a-fc6a-71e4-8aef-a886b84f45b1";

describe("requiredUuidQuery", () => {
	it("returns the value when it is a uuid", () => {
		expect(requiredUuidQuery(LEDGER, "ledgerId")).toBe(LEDGER);
	});

	it("refuses a missing parameter as REQUIRED", () => {
		expect(() => requiredUuidQuery(undefined, "ledgerId")).toThrowError(
			expect.objectContaining({
				code: "VALIDATION_FAILED",
				details: [{ field: "ledgerId", issue: "REQUIRED", value: null }],
			}),
		);
	});

	it("treats an empty parameter as missing", () => {
		expect(() => requiredUuidQuery("", "ledgerId")).toThrowError(
			expect.objectContaining({
				details: [{ field: "ledgerId", issue: "REQUIRED", value: "" }],
			}),
		);
	});

	it("refuses a value that is not a uuid", () => {
		expect(() => requiredUuidQuery("nope", "ledgerId")).toThrowError(
			expect.objectContaining({
				details: [{ field: "ledgerId", issue: "Pattern", value: "nope" }],
			}),
		);
	});
});

const LINE = { side: "DEBIT", accountId: LEDGER, amountMinor: 100 };

describe("parseEntryUpdate lines", () => {
	it("keeps a line memo", () => {
		const parsed = parseEntryUpdate({
			version: 0,
			lines: [{ ...LINE, memo: "taxi" }, { ...LINE, side: "CREDIT" }],
		});

		expect(parsed.lines?.map((line) => line.memo)).toEqual(["taxi", null]);
	});

	it("leaves a line memo null when it is absent", () => {
		const parsed = parseEntryUpdate({
			version: 0,
			lines: [LINE, { ...LINE, side: "CREDIT" }],
		});

		expect(parsed.lines?.map((line) => line.memo)).toEqual([null, null]);
	});

	it("refuses a line memo over 200 characters", () => {
		expect(() =>
			parseEntryUpdate({
				version: 0,
				lines: [{ ...LINE, memo: "x".repeat(201) }, { ...LINE, side: "CREDIT" }],
			}),
		).toThrowError(
			expect.objectContaining({
				details: [{ field: "lines[0].memo", issue: "Size", value: "x".repeat(201) }],
			}),
		);
	});
});
