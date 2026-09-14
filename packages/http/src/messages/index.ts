import type { ErrorCode } from "../error-code.ts";
import { en } from "./en.ts";
import { fallback } from "./fallback.ts";
import { ja } from "./ja.ts";
import { ko } from "./ko.ts";

export const LOCALES = ["en", "ko", "ja"] as const;

export type Locale = (typeof LOCALES)[number];

const BUNDLES: Record<Locale, Record<ErrorCode, string>> = { en, ko, ja };

export function isLocale(value: string): value is Locale {
	return (LOCALES as readonly string[]).includes(value);
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale | undefined {
	if (!header) return undefined;
	for (const part of header.split(",")) {
		const tag = part.split(";")[0]?.trim().toLowerCase();
		if (!tag) continue;
		const primary = tag.split("-")[0];
		if (primary && isLocale(primary)) return primary;
	}
	return undefined;
}

export function messageFor(code: ErrorCode, locale?: Locale): string {
	const bundle = locale ? BUNDLES[locale] : undefined;
	return bundle?.[code] ?? fallback[code];
}

export { en, fallback, ja, ko };
