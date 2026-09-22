"use client";

import { createContext, useContext, useMemo } from "react";

import { Money } from "@/ds";
import type { CurrencyMeta } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/locales";

const CurrencyMetaContext = createContext<Record<string, CurrencyMeta>>({});

export function CurrencyMetaProvider({ currencies, children }: { currencies: CurrencyMeta[]; children: React.ReactNode }) {
	const byCode = useMemo(
		() => Object.fromEntries(currencies.map((c) => [c.code, c])),
		[currencies],
	);
	return <CurrencyMetaContext.Provider value={byCode}>{children}</CurrencyMetaContext.Provider>;
}

export function useCurrencies(): CurrencyMeta[] {
	const byCode = useContext(CurrencyMetaContext);
	return useMemo(
		() => Object.values(byCode).sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code)),
		[byCode],
	);
}

/**
 * A currency as it should read to the person looking at it.
 *
 * `currency_meta` has carried `nameKo`, `nameJa` and `nameEn` since the schema
 * was written, and every picker in the app reached past the first two for the
 * third. A Korean or Japanese reader choosing a base currency was shown
 * `KRW · SOUTH KOREAN WON` — the right code beside a name in a language they
 * had not asked for.
 */
export function currencyName(currency: CurrencyMeta, locale: Locale): string {
  return locale === "ko" ? currency.nameKo : locale === "ja" ? currency.nameJa : currency.nameEn;
}

export const currencyLabel = (currency: CurrencyMeta, locale: Locale) =>
  `${currency.code} · ${currencyName(currency, locale)}`;

/** The same list every picker needs: sorted, and labelled in the reader's language. */
export function useCurrencyOptions(): { value: string; label: string }[] {
  const locale = useLocale();
  const currencies = useCurrencies();
  return useMemo(
    () => currencies.map((currency) => ({ value: currency.code, label: currencyLabel(currency, locale) })),
    [currencies, locale],
  );
}

export function useMinorUnitExponent(currency: string): number | undefined {
	return useContext(CurrencyMetaContext)[currency]?.minorUnitExponent;
}

type AmountProps = Omit<React.ComponentProps<typeof Money>, "minorUnitExponent">;

export function Amount(props: AmountProps) {
	const exponent = useMinorUnitExponent(props.currency);
	return <Money {...props} minorUnitExponent={exponent} />;
}
