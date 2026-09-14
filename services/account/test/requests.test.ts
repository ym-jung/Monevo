import { describe, expect, it } from "vitest";

import { BusinessError } from "@monevo/http";

import {
	parseAccountCreate,
	parseAccountUpdate,
	parseCategoryCreate,
	parseCategoryUpdate,
} from "../src/domain/requests.ts";

const UUID_A = "01a09aac-a8b1-7443-a567-e2cafba7c8a3";
const UUID_B = "01a09aac-a8b1-7443-a567-e2cafba7c8b4";

const account = { name: "Cash", type: "CASH", currency: "JPY" };

describe("parseAccountCreate", () => {
	it("defaults the optional fields", () => {
		expect(parseAccountCreate(account)).toEqual({
			name: "Cash",
			type: "CASH",
			currency: "JPY",
			ledgerIds: [],
			openingBalanceMinor: 0,
			memo: null,
		});
	});

	it("de-duplicates ledgerIds and keeps first-seen order", () => {
		const parsed = parseAccountCreate({ ...account, ledgerIds: [UUID_B, UUID_A, UUID_B] });

		expect(parsed.ledgerIds).toEqual([UUID_B, UUID_A]);
	});

	it("keeps a negative opening balance", () => {
		expect(parseAccountCreate({ ...account, openingBalanceMinor: -500 }).openingBalanceMinor).toBe(
			-500,
		);
	});

	it.each([
		["an unknown type", { ...account, type: "CRYPTO" }],
		["a lowercase currency", { ...account, currency: "jpy" }],
		["a name over 50 characters", { ...account, name: "x".repeat(51) }],
		["a blank name", { ...account, name: "  " }],
		["a memo over 200 characters", { ...account, memo: "x".repeat(201) }],
		["a non-uuid ledgerId", { ...account, ledgerIds: ["nope"] }],
		["more than 50 ledgerIds", { ...account, ledgerIds: Array.from({ length: 51 }, () => UUID_A) }],
		["a fractional opening balance", { ...account, openingBalanceMinor: 1.5 }],
	])("rejects %s", (_case, body) => {
		expect(() => parseAccountCreate(body)).toThrow(BusinessError);
	});
});

describe("parseAccountUpdate", () => {
	it("requires a version", () => {
		expect(() => parseAccountUpdate({ name: "Wallet" })).toThrow(BusinessError);
	});

	it("treats absent fields as no change", () => {
		expect(parseAccountUpdate({ version: 2 })).toEqual({
			name: null,
			memo: null,
			archived: null,
			version: 2,
		});
	});

	it("keeps archived false distinct from absent", () => {
		expect(parseAccountUpdate({ archived: false, version: 0 }).archived).toBe(false);
	});

	it("rejects a non-boolean archived", () => {
		expect(() => parseAccountUpdate({ archived: "yes", version: 0 })).toThrow(BusinessError);
	});
});

describe("parseCategoryCreate", () => {
	it("accepts a root", () => {
		expect(parseCategoryCreate({ name: "Food", kind: "EXPENSE" })).toEqual({
			name: "Food",
			kind: "EXPENSE",
			parentId: null,
		});
	});

	it.each([
		["an unknown kind", { name: "Food", kind: "SAVINGS" }],
		["a name over 40 characters", { name: "x".repeat(41), kind: "EXPENSE" }],
		["a non-uuid parentId", { name: "Food", kind: "EXPENSE", parentId: "nope" }],
	])("rejects %s", (_case, body) => {
		expect(() => parseCategoryCreate(body)).toThrow(BusinessError);
	});
});

describe("parseCategoryUpdate", () => {
	it("allows a sort order of zero", () => {
		expect(parseCategoryUpdate({ sortOrder: 0 }).sortOrder).toBe(0);
	});

	it("rejects a sort order past smallint", () => {
		expect(() => parseCategoryUpdate({ sortOrder: 32768 })).toThrow(BusinessError);
	});

	it("treats an empty body as no change", () => {
		expect(parseCategoryUpdate({})).toEqual({ name: null, sortOrder: null });
	});
});
