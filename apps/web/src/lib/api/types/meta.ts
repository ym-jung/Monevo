export interface CurrencyMeta {
	code: string;
	nameKo: string;
	nameJa: string;
	nameEn: string;
	symbol: string;

	minorUnitExponent: number;
	sortOrder: number;
}

export type EnumsMeta = Record<string, string[]>;
