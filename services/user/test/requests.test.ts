import { describe, expect, it } from "vitest";

import { BusinessError } from "@monevo/http";

import {
	parsePaging,
	parseRejectUser,
	parseUpdateProfile,
	parseUpdateUserStatus,
} from "../src/domain/requests.ts";

describe("parseUpdateProfile", () => {
	it("treats an empty body as no change", () => {
		expect(parseUpdateProfile({})).toEqual({
			email: null,
			displayName: null,
			displayCurrency: null,
			locale: null,
			timezone: null,
		});
	});

	it.each([
		["a malformed email", { email: "not-an-email" }],
		["an email over 255 characters", { email: "x".repeat(250) + "@e.com" }],
		["a two-letter currency", { displayCurrency: "JP" }],
		["a lowercase currency", { displayCurrency: "jpy" }],
		["a blank display name", { displayName: "   " }],
		["a display name over 60 characters", { displayName: "x".repeat(61) }],
		["a locale over 10 characters", { locale: "x".repeat(11) }],
	])("rejects %s", (_case, body) => {
		expect(() => parseUpdateProfile(body)).toThrow(BusinessError);
	});

	it("accepts a full update", () => {
		expect(
			parseUpdateProfile({
				email: "a@b.com",
				displayName: "Name",
				displayCurrency: "KRW",
				locale: "ko",
				timezone: "Asia/Seoul",
			}),
		).toEqual({
			email: "a@b.com",
			displayName: "Name",
			displayCurrency: "KRW",
			locale: "ko",
			timezone: "Asia/Seoul",
		});
	});
});

describe("parseUpdateUserStatus", () => {
	it.each(["SUSPENDED", "ACTIVE"])("accepts %s", (status) => {
		expect(parseUpdateUserStatus({ status }).status).toBe(status);
	});

	it.each(["PENDING", "DELETED", "REJECTED", "", undefined])("rejects %s", (status) => {
		expect(() => parseUpdateUserStatus({ status })).toThrow(BusinessError);
	});
});

describe("parseRejectUser", () => {
	it("allows no reason at all", () => {
		expect(parseRejectUser(undefined)).toEqual({ reason: null });
		expect(parseRejectUser({})).toEqual({ reason: null });
	});

	it("rejects a reason over 200 characters", () => {
		expect(() => parseRejectUser({ reason: "x".repeat(201) })).toThrow(BusinessError);
	});
});

describe("parsePaging", () => {
	it("defaults to the first page of fifty", () => {
		expect(parsePaging(undefined, undefined)).toEqual({ page: 0, size: 50 });
	});

	it("clamps the size to one hundred", () => {
		expect(parsePaging("0", "500").size).toBe(100);
	});

	it("clamps the size to at least one", () => {
		expect(parsePaging("0", "0").size).toBe(50);
		expect(parsePaging("0", "-5").size).toBe(1);
	});

	it("never goes below the first page", () => {
		expect(parsePaging("-3", "10").page).toBe(0);
	});

	it("falls back on unparseable values", () => {
		expect(parsePaging("abc", "abc")).toEqual({ page: 0, size: 50 });
	});
});
