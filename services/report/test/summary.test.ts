import { describe, expect, it } from "vitest";

import { toMinor } from "@monevo/money";

import type { NamedCategory } from "../src/domain/summary.ts";
import { rollUp, toAccountSummaries, toSeries } from "../src/domain/summary.ts";

const categories = new Map<string, NamedCategory>([
	["food", { id: "food", name: "Food", parentId: null }],
	["grocery", { id: "grocery", name: "Grocery", parentId: "food" }],
	["dining", { id: "dining", name: "Dining", parentId: "food" }],
	["rent", { id: "rent", name: "Rent", parentId: null }],
]);

const total = (categoryId: string, amount: number) => ({
	categoryId,
	expenseMinor: toMinor(amount),
});

describe("rollUp", () => {
	it("sums children into their root", () => {
		const tree = rollUp([total("grocery", 300), total("dining", 200)], categories);

		expect(tree).toHaveLength(1);
		expect(tree[0]!.categoryId).toBe("food");
		expect(tree[0]!.expenseMinor).toBe(500);
	});

	it("merges a root's own spend with its children", () => {
		const tree = rollUp([total("food", 100), total("grocery", 300)], categories);

		expect(tree[0]!.expenseMinor).toBe(400);
		expect(tree[0]!.children.map((child) => child.categoryId)).toEqual(["grocery"]);
	});

	it("orders roots by amount descending", () => {
		const tree = rollUp([total("rent", 900), total("grocery", 300)], categories);

		expect(tree.map((node) => node.categoryId)).toEqual(["rent", "food"]);
	});

	it("breaks an equal amount by name", () => {
		const tree = rollUp([total("rent", 100), total("food", 100)], categories);

		expect(tree.map((node) => node.name)).toEqual(["Food", "Rent"]);
	});

	it("orders children by amount then name", () => {
		const tree = rollUp([total("grocery", 100), total("dining", 100)], categories);

		expect(tree[0]!.children.map((child) => child.name)).toEqual(["Dining", "Grocery"]);
	});

	it("names an unresolved category Unknown and treats it as a root", () => {
		const tree = rollUp([total("ghost", 50)], categories);

		expect(tree[0]!.name).toBe("Unknown");
		expect(tree[0]!.children).toEqual([]);
	});

	it("returns nothing for no totals", () => {
		expect(rollUp([], categories)).toEqual([]);
	});
});

describe("toAccountSummaries", () => {
	it("orders by amount descending then name", () => {
		const summaries = toAccountSummaries(
			[
				{ accountId: "b", expenseMinor: toMinor(100) },
				{ accountId: "a", expenseMinor: toMinor(100) },
				{ accountId: "c", expenseMinor: toMinor(900) },
			],
			new Map([
				["a", "Amex"],
				["b", "Bank"],
				["c", "Cash"],
			]),
		);

		expect(summaries.map((summary) => summary.name)).toEqual(["Cash", "Amex", "Bank"]);
	});

	it("names an unresolved account Unknown", () => {
		const summaries = toAccountSummaries([{ accountId: "x", expenseMinor: toMinor(1) }], new Map());

		expect(summaries[0]!.name).toBe("Unknown");
	});
});

describe("toSeries", () => {
	const daily = [
		{ periodDate: "2026-08-30", incomeMinor: toMinor(100), expenseMinor: toMinor(40) },
		{ periodDate: "2026-09-01", incomeMinor: toMinor(0), expenseMinor: toMinor(10) },
	];

	it("fills a gap day with zeros", () => {
		const series = toSeries("2026-08-30", "2026-09-01", "DAY", daily);

		expect(series.map((point) => [point.periodStart, point.incomeMinor, point.expenseMinor])).toEqual([
			["2026-08-30", 100, 40],
			["2026-08-31", 0, 0],
			["2026-09-01", 0, 10],
		]);
	});

	it("reports net as income minus expense", () => {
		const series = toSeries("2026-08-30", "2026-08-30", "DAY", daily);

		expect(series[0]!.netMinor).toBe(60);
	});

	it("collapses days into their month", () => {
		const series = toSeries("2026-08-01", "2026-09-30", "MONTH", daily);

		expect(series.map((point) => [point.periodStart, point.expenseMinor])).toEqual([
			["2026-08-01", 40],
			["2026-09-01", 10],
		]);
	});

	it("returns a zero-filled range when there is nothing at all", () => {
		const series = toSeries("2026-08-01", "2026-08-03", "DAY", []);

		expect(series).toHaveLength(3);
		expect(series.every((point) => point.incomeMinor === 0 && point.netMinor === 0)).toBe(true);
	});
});
