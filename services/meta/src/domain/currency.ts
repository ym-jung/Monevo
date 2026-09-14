import type { CurrencyMeta } from "@monevo/contracts";

export interface Currency extends CurrencyMeta {
	yfinanceSymbolBase: string | null;
	isActive: boolean;
}

export function toMeta(currency: Currency): CurrencyMeta {
	return {
		code: currency.code,
		nameKo: currency.nameKo,
		nameJa: currency.nameJa,
		nameEn: currency.nameEn,
		symbol: currency.symbol,
		minorUnitExponent: currency.minorUnitExponent,
		sortOrder: currency.sortOrder,
	};
}

export function bySortOrderThenCode(left: Currency, right: Currency): number {
	return left.sortOrder - right.sortOrder || left.code.localeCompare(right.code);
}
