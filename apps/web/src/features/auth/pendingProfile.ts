import { isLocale } from "@/lib/i18n/locales";

const KEY = "okg-pending-profile";

export interface PendingProfile {
	displayName: string;
	locale: string;
	displayCurrency: string;
	timezone: string;
}

export function stashPendingProfile(profile: PendingProfile): void {
	try {
		sessionStorage.setItem(KEY, JSON.stringify(profile));
	} catch {

	}
}

export function readPendingProfile(): PendingProfile | null {
	let raw: string | null = null;
	try {
		raw = sessionStorage.getItem(KEY);
	} catch {
		return null;
	}
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null) return null;
		const { displayName, locale, displayCurrency, timezone } = parsed as Record<string, unknown>;
		if (typeof displayName !== "string" || !displayName.trim()) return null;
		if (typeof displayCurrency !== "string" || displayCurrency.length !== 3) return null;
		if (typeof timezone !== "string" || !timezone) return null;

		if (typeof locale !== "string" || !isLocale(locale)) return null;
		return { displayName: displayName.trim(), locale, displayCurrency, timezone };
	} catch {
		return null;
	}
}

export function clearPendingProfile(): void {
	try {
		sessionStorage.removeItem(KEY);
	} catch {

	}
}
