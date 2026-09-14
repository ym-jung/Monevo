import { describe, expect, it } from "vitest";

import { getTableConfig } from "drizzle-orm/pg-core";

import { journalLine, ledger, account, appUser, journalEntry } from "../src/schema.ts";

function columnsOf(table: Parameters<typeof getTableConfig>[0]) {
	return Object.fromEntries(getTableConfig(table).columns.map((column) => [column.name, column]));
}

describe("money columns", () => {
	it.each([
		["amount_minor"],
		["base_amount_minor"],
	])("%s is a bigint, not a number", (name) => {
		const column = columnsOf(journalLine)[name];

		expect(column).toBeDefined();
		expect(column!.getSQLType()).toBe("bigint");
		expect(column!.mapFromDriverValue("9007199254740993")).toBe(9007199254740993n);
	});

	it("survives a value past the safe integer range", () => {
		const column = columnsOf(journalLine)["base_amount_minor"]!;

		expect(column.mapFromDriverValue("9223372036854775807")).toBe(9223372036854775807n);
	});
});

describe("optimistic lock columns", () => {
	it.each([
		["ledger", ledger],
		["account", account],
		["app_user", appUser],
		["journal_entry", journalEntry],
	])("%s carries a version column", (_name, table) => {
		expect(columnsOf(table)["version"]).toBeDefined();
	});
});

describe("soft delete", () => {
	it.each([
		["ledger", ledger],
		["account", account],
		["app_user", appUser],
		["journal_entry", journalEntry],
		["journal_line", journalLine],
	])("%s carries deleted_at", (_name, table) => {
		expect(columnsOf(table)["deleted_at"]).toBeDefined();
	});
});
