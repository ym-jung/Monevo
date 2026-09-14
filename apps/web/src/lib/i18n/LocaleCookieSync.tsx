"use client";

import { useEffect } from "react";

import { LOCALE_COOKIE, type Locale } from "./locales";

export function LocaleCookieSync({ locale }: { locale: Locale }) {
	useEffect(() => {
		document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=strict`;
	}, [locale]);

	return null;
}
