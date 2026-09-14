import { beforeEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.ts";

const RESPONSE_FIELDS = [
	"code",
	"nameKo",
	"nameJa",
	"nameEn",
	"symbol",
	"minorUnitExponent",
	"sortOrder",
];

const ENUM_KEYS = [
	"userRole",
	"userStatus",
	"ledgerMemberRole",
	"accountType",
	"accountNature",
	"accountSubtype",
	"categoryKind",
	"journalEntryKind",
	"journalLineSide",
	"fxRateSource",
];

interface Envelope<T> {
	data: T;
}

interface CurrencyRow {
	code: string;
	minorUnitExponent: number;
	sortOrder: number;
}

type EnumRows = Record<string, string[]>;

let app: ReturnType<typeof createApp>;

beforeEach(() => {
	app = createApp();
});

async function get<T>(path: string, init?: RequestInit) {
	const response = await app.request(path, init);
	return { response, body: (await response.json()) as T };
}

describe("GET /api/v1/meta/currencies", () => {
	it("returns every active currency and omits inactive ones", async () => {
		const { body } = await get<Envelope<CurrencyRow[]>>("/api/v1/meta/currencies");

		expect(body.data.map((currency) => currency.code).sort()).toEqual([
			"JPY",
			"KRW",
			"USD",
		]);
	});

	it("orders by sortOrder then code", async () => {
		const { body } = await get<Envelope<CurrencyRow[]>>("/api/v1/meta/currencies");

		expect(body.data.map((currency) => currency.code)).toEqual([
			"USD",
			"KRW",
			"JPY",
		]);
	});

	it("returns code, nameKo, nameJa, nameEn, symbol, minorUnitExponent, sortOrder and nothing else", async () => {
		const { body } = await get<Envelope<CurrencyRow[]>>("/api/v1/meta/currencies");

		for (const currency of body.data) {
			expect(Object.keys(currency).sort()).toEqual([...RESPONSE_FIELDS].sort());
		}
	});

	it("wraps the list in the ApiResponse data envelope", async () => {
		const { response, body } = await get<Envelope<CurrencyRow[]>>("/api/v1/meta/currencies");

		expect(response.status).toBe(200);
		expect(Object.keys(body)).toEqual(["data"]);
		expect(Array.isArray(body.data)).toBe(true);
	});

	it("serves the request without a bearer token", async () => {
		const { response } = await get<Envelope<CurrencyRow[]>>("/api/v1/meta/currencies");

		expect(response.status).toBe(200);
	});

	it("reports the exponent the server decides, so a client never assumes /100", async () => {
		const { body } = await get<Envelope<CurrencyRow[]>>("/api/v1/meta/currencies");
		const exponents = Object.fromEntries(
			body.data.map((currency) => [currency.code, currency.minorUnitExponent]),
		);

		expect(exponents).toEqual({ USD: 2, KRW: 0, JPY: 0 });
	});
});

describe("GET /api/v1/meta/enums", () => {
	it("returns userRole, userStatus, ledgerMemberRole, accountType, accountNature, accountSubtype, categoryKind, journalEntryKind, journalLineSide and fxRateSource", async () => {
		const { body } = await get<Envelope<EnumRows>>("/api/v1/meta/enums");

		expect(Object.keys(body.data).sort()).toEqual([...ENUM_KEYS].sort());
	});

	it("returns each enum as an array of the constant names", async () => {
		const { body } = await get<Envelope<EnumRows>>("/api/v1/meta/enums");

		for (const key of ENUM_KEYS) {
			expect(Array.isArray(body.data[key])).toBe(true);
			for (const name of body.data[key] ?? []) expect(name).toMatch(/^[A-Z][A-Z_]*$/);
		}

		expect(body.data["journalLineSide"]).toEqual(["DEBIT", "CREDIT"]);
	});

	it("serves the request without a bearer token", async () => {
		const { response } = await get<Envelope<EnumRows>>("/api/v1/meta/enums");

		expect(response.status).toBe(200);
	});
});

describe("request id", () => {
	it("echoes an incoming x-request-id", async () => {
		const { response } = await get<Envelope<EnumRows>>("/api/v1/meta/enums", {
			headers: { "x-request-id": "given-id" },
		});

		expect(response.headers.get("x-request-id")).toBe("given-id");
	});

	it("generates one when the caller sends none", async () => {
		const { response } = await get<Envelope<EnumRows>>("/api/v1/meta/enums");

		expect(response.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/);
	});
});

describe("unmatched requests", () => {
	it("returns NOT_FOUND in the failure envelope for an unknown path", async () => {
		const { response, body } = await get<{ error: { code: string; details: unknown[] } }>(
			"/api/v1/meta/nope",
		);

		expect(response.status).toBe(404);
		expect(body.error.code).toBe("NOT_FOUND");
		expect(body.error.details).toEqual([]);
	});

	it("returns METHOD_NOT_ALLOWED when the path exists under another method", async () => {
		const { response, body } = await get<{ error: { code: string } }>("/api/v1/meta/currencies", {
			method: "POST",
		});

		expect(response.status).toBe(405);
		expect(body.error.code).toBe("METHOD_NOT_ALLOWED");
	});

	it("localises the failure message from accept-language", async () => {
		const { body } = await get<{ error: { message: string } }>("/api/v1/meta/nope", {
			headers: { "accept-language": "ko-KR,ko;q=0.9" },
		});

		expect(body.error.message).toBe("요청한 리소스를 찾을 수 없습니다.");
	});

	it("carries the request id as traceId", async () => {
		const { body } = await get<{ error: { traceId: string } }>("/api/v1/meta/nope", {
			headers: { "x-request-id": "trace-me" },
		});

		expect(body.error.traceId).toBe("trace-me");
	});
});
