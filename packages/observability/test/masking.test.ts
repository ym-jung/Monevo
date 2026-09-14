import { describe, expect, it } from "vitest";

import { maskDestination, maskEmails } from "../src/masking.ts";

describe("maskEmails", () => {
	it("keeps the first character and the domain", () => {
		expect(maskEmails("signed in as alice@example.com")).toBe("signed in as a***@example.com");
	});

	it("masks every address in the line", () => {
		expect(maskEmails("alice@example.com -> bob@example.co.uk")).toBe(
			"a***@example.com -> b***@example.co.uk",
		);
	});

	it("leaves a line without an address alone", () => {
		expect(maskEmails("nothing to mask here")).toBe("nothing to mask here");
	});
});

describe("maskDestination", () => {
	it("masks both the local part and the domain", () => {
		expect(maskDestination("alice@example.com")).toBe("a***@e***.com");
	});

	it("returns null when there is no local part", () => {
		expect(maskDestination("@example.com")).toBeNull();
	});

	it("returns null when the domain has no dot", () => {
		expect(maskDestination("alice@example")).toBeNull();
	});
});
