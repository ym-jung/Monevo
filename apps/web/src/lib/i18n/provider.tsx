"use client";

import { createContext, useContext, useMemo } from "react";

import { createTranslate, getMessages, type Translate } from "./dictionary";
import { DEFAULT_LOCALE, type Locale } from "./locales";
import { ApiError } from "@/lib/api/errors";

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

/**
 * What to show the reader when a request fails.
 *
 * The server answers in English — it has one message per code and no idea who
 * is reading — and the app was putting that message straight on the screen. A
 * Korean or Japanese reader hit a wall of English at exactly the moment they
 * needed to understand something.
 *
 * A code with no entry in the dictionary still shows the server's message,
 * because a sentence in the wrong language beats a blank. Adding a translation
 * is therefore always an improvement and never a prerequisite.
 */
export function useErrorMessage(): (error: unknown, fallback?: string) => string {
	const locale = useLocale();
	const t = useT();
	return useMemo(() => {
		const messages = getMessages(locale);
		return (error: unknown, fallback?: string) => {
			if (!(error instanceof ApiError)) return fallback ?? t("common.genericError");
			const key = `error.${error.code}`;
			return key in messages ? messages[key as keyof typeof messages] : error.message || fallback || t("common.genericError");
		};
	}, [locale, t]);
}
