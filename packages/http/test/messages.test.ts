import { describe, expect, it } from "vitest";

import { errorCodeStatus } from "../src/error-code.ts";
import type { ErrorCode } from "../src/error-code.ts";
import { en, fallback, ja, ko } from "../src/messages/index.ts";
import { localeFromAcceptLanguage, messageFor } from "../src/messages/index.ts";

const codes = Object.keys(errorCodeStatus) as ErrorCode[];
const bundles = { fallback, en, ko, ja };

describe("error message bundles", () => {
	it.each(Object.entries(bundles))("%s covers every error code and nothing else", (_name, bundle) => {
		expect(Object.keys(bundle).sort()).toEqual([...codes].sort());
	});

	it.each(Object.entries(bundles))("%s has no blank message", (_name, bundle) => {
		for (const code of codes) expect(bundle[code].trim()).not.toBe("");
	});

	it("translates ko and ja away from the default bundle", () => {
		for (const code of codes) {
			expect(ko[code]).not.toBe(fallback[code]);
			expect(ja[code]).not.toBe(fallback[code]);
		}
	});
});

describe("messageFor", () => {
	it("falls back to the default bundle for an unknown locale", () => {
		expect(messageFor("NOT_FOUND")).toBe(fallback.NOT_FOUND);
	});

	it("returns the requested locale", () => {
		expect(messageFor("NOT_FOUND", "ko")).toBe(ko.NOT_FOUND);
	});
});

describe("localeFromAcceptLanguage", () => {
	it("picks the first supported tag", () => {
		expect(localeFromAcceptLanguage("fr-FR,ko-KR;q=0.9,en;q=0.8")).toBe("ko");
	});

	it("matches on the primary subtag", () => {
		expect(localeFromAcceptLanguage("ja-JP")).toBe("ja");
	});

	it("returns undefined when nothing is supported", () => {
		expect(localeFromAcceptLanguage("fr-FR,de;q=0.9")).toBeUndefined();
	});

	it("returns undefined when the header is absent", () => {
		expect(localeFromAcceptLanguage(null)).toBeUndefined();
	});
});
