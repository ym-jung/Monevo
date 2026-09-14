import type { Currency } from "../domain/currency.ts";

export interface CurrencyRepository {
	findAll(): Promise<Currency[]>;
	findByCode(code: string): Promise<Currency | undefined>;
}

const SEEDED: readonly Currency[] = [
	{
		code: "USD",
		nameKo: "미국 달러",
		nameJa: "米ドル",
		nameEn: "US Dollar",
		symbol: "$",
		minorUnitExponent: 2,
		sortOrder: 1,
		yfinanceSymbolBase: null,
		isActive: true,
	},
	{
		code: "KRW",
		nameKo: "대한민국 원",
		nameJa: "韓国ウォン",
		nameEn: "South Korean Won",
		symbol: "₩",
		minorUnitExponent: 0,
		sortOrder: 2,
		yfinanceSymbolBase: "KRW=X",
		isActive: true,
	},
	{
		code: "JPY",
		nameKo: "일본 엔",
		nameJa: "日本円",
		nameEn: "Japanese Yen",
		symbol: "¥",
		minorUnitExponent: 0,
		sortOrder: 3,
		yfinanceSymbolBase: "JPY=X",
		isActive: true,
	},
];

export function seededCurrencyRepository(): CurrencyRepository {
	return {
		findAll: async () => SEEDED.map((currency) => ({ ...currency })),
		findByCode: async (code) => {
			const found = SEEDED.find((currency) => currency.code === code);
			return found ? { ...found } : undefined;
		},
	};
}
