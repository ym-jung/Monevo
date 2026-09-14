import { describe, expect, it } from "vitest";

import { BusinessError } from "@monevo/http";

import { CHAR_POOL, CODE_LENGTH, expiresAt, normalizeCode, randomCode } from "../src/domain/invite-code.ts";
import { requireValidTimezone } from "../src/domain/timezone.ts";
import {
	parseInviteRequest,
	parseLedgerCreate,
	parseLedgerUpdate,
} from "../src/domain/requests.ts";

describe("randomCode", () => {
	it("is eight characters from the pool", () => {
		for (let i = 0; i < 200; i++) {
			const code = randomCode();

			expect(code).toHaveLength(CODE_LENGTH);
			expect([...code].every((character) => CHAR_POOL.includes(character))).toBe(true);
		}
	});

	it("excludes characters that are easy to misread", () => {
		expect(CHAR_POOL).not.toMatch(/[01IO]/);
	});

	it("does not repeat itself over many draws", () => {
		const codes = new Set(Array.from({ length: 500 }, randomCode));

		expect(codes.size).toBeGreaterThan(495);
	});
});

describe("normalizeCode", () => {
	it.each([
		["  abcdefgh  ", "ABCDEFGH"],
		["AbCdEfGh", "ABCDEFGH"],
		[undefined, ""],
		[null, ""],
	])("normalises %s", (input, expected) => {
		expect(normalizeCode(input)).toBe(expected);
	});
});

describe("expiresAt", () => {
	it("adds whole days", () => {
		const from = new Date("2026-08-05T12:00:00Z");

		expect(expiresAt(from, 7).toISOString()).toBe("2026-08-12T12:00:00.000Z");
	});
});

describe("requireValidTimezone", () => {
	it.each(["UTC", "Asia/Tokyo", "America/New_York"])("accepts %s", (zone) => {
		expect(requireValidTimezone(zone)).toBe(zone);
	});

	it.each(["Mars/Olympus", "", "not a zone"])("rejects %s", (zone) => {
		expect(() => requireValidTimezone(zone)).toThrow(BusinessError);
	});
});

describe("request parsing", () => {
	const valid = {
		name: "Home",
		currency: "JPY",
		timezone: "Asia/Tokyo",
		confirmCurrencyIrreversible: true,
	};

	it("trims and keeps a valid create request", () => {
		expect(parseLedgerCreate({ ...valid, name: "  Home  " })).toEqual(valid);
	});

	it("defaults the currency confirmation to false when absent", () => {
		const body = { name: valid.name, currency: valid.currency, timezone: valid.timezone };

		expect(parseLedgerCreate(body).confirmCurrencyIrreversible).toBe(false);
	});

	it.each([
		["a blank name", { ...valid, name: "   " }],
		["a name over 100 characters", { ...valid, name: "x".repeat(101) }],
		["a lowercase currency", { ...valid, currency: "jpy" }],
		["a four-letter currency", { ...valid, currency: "JPYY" }],
		["a missing timezone", { ...valid, timezone: undefined }],
		["a non-object body", "nope"],
		["a null body", null],
		["an array body", []],
	])("rejects %s", (_case, body) => {
		expect(() => parseLedgerCreate(body)).toThrow(BusinessError);
	});

	it("names the offending field in the failure detail", () => {
		try {
			parseLedgerCreate({ ...valid, currency: "jpy" });
			expect.unreachable();
		} catch (error) {
			expect((error as BusinessError).details).toEqual([
				{ field: "currency", issue: "Pattern", value: "jpy" },
			]);
		}
	});

	it("requires a version on update", () => {
		expect(() => parseLedgerUpdate({ name: "Home" })).toThrow(BusinessError);
		expect(parseLedgerUpdate({ name: "Home", version: 3 })).toEqual({ name: "Home", version: 3 });
	});

	it("treats an absent invite body as all defaults", () => {
		expect(parseInviteRequest(undefined)).toEqual({
			expiresInDays: undefined,
			maxUses: undefined,
		});
	});

	it.each([
		["expiresInDays below 1", { expiresInDays: 0 }],
		["expiresInDays above 30", { expiresInDays: 31 }],
		["maxUses below 1", { maxUses: 0 }],
		["maxUses above 10", { maxUses: 11 }],
		["a fractional maxUses", { maxUses: 1.5 }],
	])("rejects %s", (_case, body) => {
		expect(() => parseInviteRequest(body)).toThrow(BusinessError);
	});

	it("accepts the boundary values", () => {
		expect(parseInviteRequest({ expiresInDays: 30, maxUses: 10 })).toEqual({
			expiresInDays: 30,
			maxUses: 10,
		});
	});
});
