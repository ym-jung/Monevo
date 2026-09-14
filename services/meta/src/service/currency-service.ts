import type { CurrencyMeta } from "@monevo/contracts";
import { ValidationError } from "@monevo/http";

import type { Currency } from "../domain/currency.ts";
import { bySortOrderThenCode, toMeta } from "../domain/currency.ts";
import type { CurrencyRepository } from "../repository/currency-repository.ts";

export interface CurrencyService {
	listActive(): Promise<CurrencyMeta[]>;
	require(code: string | null | undefined): Promise<Currency>;
	exponentOf(code: string): Promise<number>;
}

export function createCurrencyService(repository: CurrencyRepository): CurrencyService {
	let cached: Currency[] | undefined;

	const all = async (): Promise<Currency[]> => {
		cached ??= await repository.findAll();
		return cached;
	};

	const require = async (code: string | null | undefined): Promise<Currency> => {
		if (!code) throw new ValidationError("CURRENCY_NOT_SUPPORTED");

		const found = (await all()).find((currency) => currency.code === code);
		if (!found) throw new ValidationError("CURRENCY_NOT_SUPPORTED");

		return found;
	};

	return {
		listActive: async () =>
			(await all())
				.filter((currency) => currency.isActive)
				.sort(bySortOrderThenCode)
				.map(toMeta),
		require,
		exponentOf: async (code) => (await require(code)).minorUnitExponent,
	};
}
