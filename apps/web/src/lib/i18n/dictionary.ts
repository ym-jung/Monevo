import { en, type MessageKey, type Messages } from "./messages/en";
import { ja } from "./messages/ja";
import { ko } from "./messages/ko";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const DICTIONARIES: Record<Locale, Messages> = { en, ko, ja };

export type Vars = Record<string, string | number>;

export type Translate = (key: MessageKey, vars?: Vars) => string;

export function getMessages(locale: Locale): Messages {
	return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export function createTranslate(locale: Locale): Translate {
	const messages = getMessages(locale);
	return (key, vars) => {

		const template = messages[key] ?? en[key] ?? key;
		if (!vars) return template;
		return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
			name in vars ? String(vars[name]) : whole,
		);
	};
}

export type { MessageKey, Messages };
