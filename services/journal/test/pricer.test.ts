import { describe, expect, it } from "vitest";

import { BusinessError } from "@monevo/http";
import { toMinor } from "@monevo/money";

import { price } from "../src/domain/pricer.ts";
import type { LineRequest, PricingContext } from "../src/domain/pricer.ts";
import { deriveKind, requireBalanced, validateShape } from "../src/domain/shape.ts";
import type { UsableAccount } from "../src/domain/shape.ts";

const EXPONENTS: Record<string, number> = { JPY: 0, KRW: 0, USD: 2 };

function context(baseCurrency: string, quotes: Record<string, string> = {}): PricingContext {
	return {
		baseCurrency,
		exponentOf: (currency) => EXPONENTS[currency]!,
		quoteFor: (currency) =>
			quotes[currency] ? { rate: quotes[currency]!, asOf: "2026-08-05" } : undefined,
	};
}

const line = (over: Partial<LineRequest>): LineRequest => ({
	side: "DEBIT",
	accountId: "a",
	currency: "JPY",
	amountMinor: 1000,
	requestedRate: null,
	memo: null,
	...over,
});

describe("price", () => {
	it("leaves a same-currency entry untouched", () => {
		const priced = price(
			[line({ side: "DEBIT" }), line({ side: "CREDIT", accountId: "b" })],
			context("JPY"),
		);

		expect(priced.map((p) => [p.baseAmountMinor, p.fxRate, p.source])).toEqual([
			[1000n, "1", "SAME_CURRENCY"],
			[1000n, "1", "SAME_CURRENCY"],
		]);
	});

	it("converts a foreign line and records the source", () => {
		const priced = price(
			[
				line({ side: "DEBIT", currency: "USD", amountMinor: 1200 }),
				line({ side: "CREDIT", accountId: "b", amountMinor: 1800 }),
			],
			context("JPY", { USD: "150" }),
		);

		expect(priced[0]!.baseAmountMinor).toBe(1800n);
		expect(priced[0]!.source).toBe("FX_SERVICE");
		expect(priced[0]!.asOf).toBe("2026-08-05");
	});

	it("prefers a rate the caller supplied", () => {
		const priced = price(
			[
				line({ side: "DEBIT", currency: "USD", amountMinor: 100, requestedRate: "200" }),
				line({ side: "CREDIT", accountId: "b", amountMinor: 200 }),
			],
			context("JPY", { USD: "150" }),
		);

		expect(priced[0]!.source).toBe("MANUAL");
		expect(priced[0]!.baseAmountMinor).toBe(200n);
	});

	it("rejects a non-positive supplied rate", () => {
		expect(() =>
			price(
				[
					line({ currency: "USD", requestedRate: "0" }),
					line({ side: "CREDIT", accountId: "b" }),
				],
				context("JPY"),
			),
		).toThrow(BusinessError);
	});

	it("fails when no rate is available", () => {
		expect(() =>
			price(
				[line({ currency: "USD" }), line({ side: "CREDIT", accountId: "b" })],
				context("JPY"),
			),
		).toThrow(BusinessError);
	});

	it("anchors the base-currency side and derives the other", () => {
		const priced = price(
			[
				line({ side: "DEBIT", accountId: "a", amountMinor: 1000 }),
				line({ side: "DEBIT", accountId: "b", amountMinor: 500 }),
				line({ side: "CREDIT", accountId: "c", currency: "USD", amountMinor: 1000 }),
			],
			context("JPY", { USD: "150.5" }),
		);

		const debits = priced.filter((p) => p.side === "DEBIT");
		const credits = priced.filter((p) => p.side === "CREDIT");
		const sum = (rows: typeof priced) => rows.reduce((t, r) => t + r.baseAmountMinor, 0n);

		expect(sum(debits)).toBe(sum(credits));
		expect(credits[0]!.source).toBe("DERIVED");
		expect(credits[0]!.asOf).toBeNull();
	});

	it("refuses to rewrite a line that is already in the base currency", () => {
		expect(() =>
			price(
				[
					line({ side: "DEBIT", accountId: "a", amountMinor: 1000 }),
					line({ side: "DEBIT", accountId: "b", currency: "USD", amountMinor: 100 }),
					line({ side: "CREDIT", accountId: "c", currency: "USD", amountMinor: 1000 }),
				],
				context("JPY", { USD: "150" }),
			),
		).toThrow(BusinessError);
	});

	it("keeps a small foreign amount from vanishing", () => {
		const priced = price(
			[
				line({ side: "DEBIT", currency: "USD", amountMinor: 1, requestedRate: "0.0001" }),
				line({ side: "CREDIT", accountId: "b", amountMinor: 1 }),
			],
			context("JPY"),
		);

		expect(priced[0]!.baseAmountMinor).toBe(1n);
	});
});

describe("validateShape", () => {
	const two = [
		{ side: "DEBIT" as const, accountId: "a", amountMinor: 100, currency: null, fxRate: null, memo: null },
		{ side: "CREDIT" as const, accountId: "b", amountMinor: 100, currency: null, fxRate: null, memo: null },
	];

	it("accepts a two-line entry", () => {
		expect(() => validateShape(two)).not.toThrow();
	});

	it.each([
		["fewer than two lines", [two[0]!]],
		["only debits", [two[0]!, { ...two[0]!, accountId: "c" }]],
		["a zero amount", [{ ...two[0]!, amountMinor: 0 }, two[1]!]],
		["a negative amount", [{ ...two[0]!, amountMinor: -1 }, two[1]!]],
		["the same account on both sides", [two[0]!, { ...two[1]!, accountId: "a" }]],
	])("rejects %s", (_case, lines) => {
		expect(() => validateShape(lines)).toThrow(BusinessError);
	});
});

describe("deriveKind", () => {
	const account = (nature: string): UsableAccount => ({
		id: "x",
		name: "x",
		nature,
		subtype: nature === "ASSET" || nature === "LIABILITY" ? "REAL" : "CATEGORY",
		currency: "JPY",
		parentId: null,
		archivedAt: null,
		ledgerId: null,
	});

	const lineFor = (accountId: string) => ({
		side: "DEBIT" as const,
		accountId,
		amountMinor: 1,
		currency: null,
		fxRate: null,
		memo: null,
	});

	it.each([
		["TRANSFER", ["ASSET", "ASSET"]],
		["EXPENSE", ["EXPENSE", "ASSET"]],
		["INCOME", ["INCOME", "ASSET"]],
		["SPLIT", ["EXPENSE", "INCOME"]],
	])("derives %s", (expected, natures) => {
		const accounts = new Map(natures.map((nature, i) => [String(i), account(nature)]));
		const lines = natures.map((_, i) => lineFor(String(i)));

		expect(deriveKind(lines, accounts)).toBe(expected);
	});
});

describe("requireBalanced", () => {
	it("accepts equal sides", () => {
		expect(() =>
			requireBalanced([
				{ side: "DEBIT", baseAmountMinor: toMinor(100) },
				{ side: "CREDIT", baseAmountMinor: toMinor(100) },
			]),
		).not.toThrow();
	});

	it("rejects a difference of one minor unit", () => {
		expect(() =>
			requireBalanced([
				{ side: "DEBIT", baseAmountMinor: toMinor(100) },
				{ side: "CREDIT", baseAmountMinor: toMinor(99) },
			]),
		).toThrow(BusinessError);
	});
});
