import { describe, expect, it } from "vitest";

import { BusinessError } from "@monevo/http";

import type { Currency } from "../src/domain/currency.ts";
import type { CurrencyRepository } from "../src/repository/currency-repository.ts";
import { seededCurrencyRepository } from "../src/repository/currency-repository.ts";
import { createCurrencyService } from "../src/service/currency-service.ts";

function countingRepository(rows: Currency[]): CurrencyRepository & { calls: number } {
	const repository = {
		calls: 0,
		findAll: async () => {
			repository.calls += 1;
			return rows;
		},
		findByCode: async (code: string) => rows.find((row) => row.code === code),
	};
	return repository;
}

const inactive: Currency = {
	code: "EUR",
	nameKo: "유로",
	nameJa: "ユーロ",
	nameEn: "Euro",
	symbol: "€",
	minorUnitExponent: 2,
	sortOrder: 4,
	yfinanceSymbolBase: null,
	isActive: false,
};

describe("currencyService.require", () => {
	const service = createCurrencyService(seededCurrencyRepository());

	it("throws CURRENCY_NOT_SUPPORTED for an unknown code", async () => {
		await expect(service.require("XXX")).rejects.toSatisfy(
			(error: BusinessError) => error.code === "CURRENCY_NOT_SUPPORTED" && error.status === 400,
		);
	});

	it("throws CURRENCY_NOT_SUPPORTED for a null code", async () => {
		await expect(service.require(null)).rejects.toBeInstanceOf(BusinessError);
	});

	it("returns the exponent for a known code", async () => {
		await expect(service.exponentOf("USD")).resolves.toBe(2);
		await expect(service.exponentOf("JPY")).resolves.toBe(0);
	});
});

describe("currencyService.listActive", () => {
	it("omits inactive currencies", async () => {
		const repository = countingRepository([...(await seededCurrencyRepository().findAll()), inactive]);
		const service = createCurrencyService(repository);

		const codes = (await service.listActive()).map((currency) => currency.code);

		expect(codes).not.toContain("EUR");
	});

	it("reuses the cached list on a warm invocation", async () => {
		const repository = countingRepository(await seededCurrencyRepository().findAll());
		const service = createCurrencyService(repository);

		await service.listActive();
		await service.listActive();
		await service.require("USD");

		expect(repository.calls).toBe(1);
	});
});
