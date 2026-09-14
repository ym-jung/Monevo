export const LOCALES = ["en", "ko", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE = "okg-locale";

export function isLocale(value: string | undefined | null): value is Locale {
	return !!value && (LOCALES as readonly string[]).includes(value);
}

export function localeFromAcceptLanguage(header: string | null): Locale {
	if (!header) return DEFAULT_LOCALE;
	for (const part of header.split(",")) {
		const tag = part.split(";")[0].trim().toLowerCase();
		const base = tag.split("-")[0];
		if (isLocale(base)) return base;
	}
	return DEFAULT_LOCALE;
}
