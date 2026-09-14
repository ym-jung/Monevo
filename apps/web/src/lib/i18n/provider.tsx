"use client";

import { createContext, useContext, useMemo } from "react";

import { createTranslate, type Translate } from "./dictionary";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
	return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
	return useContext(LocaleContext);
}

export function useT(): Translate {
	const locale = useLocale();
	return useMemo(() => createTranslate(locale), [locale]);
}
