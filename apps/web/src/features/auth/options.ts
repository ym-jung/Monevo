import { LOCALES } from "@/lib/i18n/locales";

const LOCALE_LABELS: Record<string, string> = { en: "English", ko: "한국어", ja: "日本語" };

export const LOCALE_OPTIONS = LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] }));

export const TIMEZONES = ["Asia/Tokyo", "Asia/Seoul", "UTC"];

export const TIMEZONE_OPTIONS = TIMEZONES.map((value) => ({ value, label: value }));

export function defaultTimezone(): string {
	try {
		const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		return TIMEZONES.includes(zone) ? zone : TIMEZONES[0];
	} catch {
		return TIMEZONES[0];
	}
}
