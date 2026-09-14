import { expect, test } from "@playwright/test";

import { SERVICES, serviceFor, serviceForPath } from "../src/lib/api/upstream";

const LEDGER = "01a09aac-a8b1-7443-a567-e2c982ba1e91";

test.describe("serviceFor", () => {
	const cases: [string, string | undefined][] = [
		["meta/currencies", "meta"],
		["meta/enums", "meta"],
		["users/me", "user"],
		["admin/users", "user"],
		[`admin/users/${LEDGER}/approve`, "user"],
		["accounts", "account"],
		[`accounts/${LEDGER}`, "account"],
		[`accounts/${LEDGER}/balance`, "account"],
		[`accounts/${LEDGER}/ledgers/${LEDGER}`, "account"],
		[`categories/${LEDGER}`, "account"],
		["ledgers", "ledger"],
		[`ledgers/${LEDGER}`, "ledger"],
		[`ledgers/${LEDGER}/members`, "ledger"],
		[`ledgers/${LEDGER}/members/${LEDGER}`, "ledger"],
		[`ledgers/${LEDGER}/invites`, "ledger"],
		[`invites/ABCD2345/accept`, "ledger"],
		["journal-entries", "journal"],
		[`journal-entries/${LEDGER}`, "journal"],
		["fx/rate", undefined],
		["actuator/health", undefined],
		["", undefined],
	];

	for (const [path, expected] of cases) {
		test(`routes ${path || "(empty)"} to ${expected ?? "the JVM"}`, () => {
			expect(serviceForPath(path)).toBe(expected);
		});
	}
});

test.describe("the ledger prefix splits three ways", () => {
	test("categories under a ledger belong to account", () => {
		expect(serviceForPath(`ledgers/${LEDGER}/categories`)).toBe("account");
	});

	test("summary and analysis under a ledger belong to report", () => {
		expect(serviceForPath(`ledgers/${LEDGER}/summary`)).toBe("report");
		expect(serviceForPath(`ledgers/${LEDGER}/analysis`)).toBe("report");
	});

	test("everything else under a ledger stays with ledger", () => {
		expect(serviceForPath(`ledgers/${LEDGER}/invites/${LEDGER}`)).toBe("ledger");
	});
});

test.describe("shape", () => {
	test("a leading slash does not change the answer", () => {
		expect(serviceForPath("/meta/currencies")).toBe(serviceForPath("meta/currencies"));
	});

	test("an unknown prefix falls through to the JVM", () => {
		expect(serviceForPath("transactions")).toBeUndefined();
	});

	test("every service the table names is a known service", () => {
		const named = new Set(
			[
				"meta/currencies",
				"users/me",
				"accounts",
				`ledgers/${LEDGER}`,
				`ledgers/${LEDGER}/summary`,
				"journal-entries",
			].map((path) => serviceForPath(path)),
		);

		for (const service of named) expect(SERVICES).toContain(service);
	});

	test("serviceFor takes segments directly", () => {
		expect(serviceFor(["ledgers", LEDGER, "categories"])).toBe("account");
	});
});
