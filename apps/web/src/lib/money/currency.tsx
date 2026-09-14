"use client";

import { createContext, useContext, useMemo } from "react";

import { Money } from "@/ds";
import type { CurrencyMeta } from "@/lib/api/types";

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

export function useMinorUnitExponent(currency: string): number | undefined {
	return useContext(CurrencyMetaContext)[currency]?.minorUnitExponent;
}

type AmountProps = Omit<React.ComponentProps<typeof Money>, "minorUnitExponent">;

export function Amount(props: AmountProps) {
	const exponent = useMinorUnitExponent(props.currency);
	return <Money {...props} minorUnitExponent={exponent} />;
}
