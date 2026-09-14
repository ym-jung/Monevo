import "server-only";

import { headers } from "next/headers";

import { currentSession } from "@/features/auth/session";

import { createTranslate, type Translate } from "./dictionary";
import { DEFAULT_LOCALE, isLocale, localeFromAcceptLanguage, type Locale } from "./locales";

async function currentUserLocale(): Promise<string | undefined> {
	try {
		const session = await currentSession();
		return session.kind === "signed-out" ? undefined : (session.user?.locale ?? undefined);
	} catch {
		return undefined;
	}
}

export async function resolveLocale(): Promise<Locale> {
	const chosen = await currentUserLocale();
	if (isLocale(chosen)) return chosen;

	const header = (await headers()).get("accept-language");
	return localeFromAcceptLanguage(header) ?? DEFAULT_LOCALE;
}

export async function getTranslate(): Promise<Translate> {
	return createTranslate(await resolveLocale());
}
