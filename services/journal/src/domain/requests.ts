import type {
	JournalEntryCreateRequest,
	JournalEntryUpdateRequest,
	JournalLineInput,
} from "@monevo/contracts";

import { asFields, optionalString, reject, requiredInt, requiredString } from "./validate.ts";
import type { Fields } from "./validate.ts";

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY = /^[A-Z]{3}$/;
const DECIMAL = /^\d+(\.\d+)?$/;

const KINDS = ["EXPENSE", "INCOME", "TRANSFER", "SPLIT", "OPENING"];

function uuid(fields: Fields, field: string): string {
	const value = fields[field];
	if (typeof value !== "string" || !UUID.test(value)) reject(field, "Pattern", value);

	return value;
}

function optionalUuid(fields: Fields, field: string): string | null {
	const value = fields[field];
	if (value === undefined || value === null) return null;

	return uuid(fields, field);
}

function date(fields: Fields, field: string): string {
	const value = fields[field];
	if (typeof value !== "string" || !DATE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
		reject(field, "Pattern", value);
	}

	return value;
}

function parseLine(raw: unknown, index: number): JournalLineInput {
	const fields = asFields(raw);
	const at = (field: string) => `lines[${index}].${field}`;

	const side = fields["side"];
	if (side !== "DEBIT" && side !== "CREDIT") reject(at("side"), "Pattern", side);

	const accountId = fields["accountId"];
	if (typeof accountId !== "string" || !UUID.test(accountId)) {
		reject(at("accountId"), "Pattern", accountId);
	}

	const amount = fields["amountMinor"];
	if (!Number.isSafeInteger(amount) || (amount as number) <= 0) {
		reject(at("amountMinor"), "Positive", amount);
	}

	const currency = fields["currency"];
	if (currency !== undefined && currency !== null) {
		if (typeof currency !== "string" || !CURRENCY.test(currency)) {
			reject(at("currency"), "Pattern", currency);
		}
	}

	const fxRate = fields["fxRate"];
	if (fxRate !== undefined && fxRate !== null) {
		if (typeof fxRate !== "string" || !DECIMAL.test(fxRate)) {
			reject(at("fxRate"), "Pattern", fxRate);
		}
	}

	const memo = fields["memo"];
	if (memo !== undefined && memo !== null) {
		if (typeof memo !== "string" || memo.length > 200) reject(at("memo"), "Size", memo);
	}

	return {
		side,
		accountId,
		amountMinor: amount as number,
		currency: (currency as string | undefined) ?? null,
		fxRate: (fxRate as string | undefined) ?? null,
		memo: (memo as string | undefined) ?? null,
	};
}

function parseLines(fields: Fields): JournalLineInput[] {
	const raw = fields["lines"];
	if (!Array.isArray(raw)) reject("lines", "NotNull", raw);
	if (raw.length < 2 || raw.length > 191) reject("lines", "Size", raw.length);

	return raw.map(parseLine);
}

export function parseEntryCreate(raw: unknown): JournalEntryCreateRequest {
	const fields = asFields(raw);

	return {
		clientRequestId: optionalUuid(fields, "clientRequestId"),
		ledgerId: uuid(fields, "ledgerId"),
		entryDate: date(fields, "entryDate"),
		description: requiredString(fields, "description", { max: 200 }),
		memo: optionalString(fields, "memo", 2000) ?? null,
		lines: parseLines(fields),
	};
}

export function parseEntryUpdate(raw: unknown): JournalEntryUpdateRequest {
	const fields = asFields(raw);

	return {
		entryDate: fields["entryDate"] === undefined || fields["entryDate"] === null
			? null
			: date(fields, "entryDate"),
		description: fields["description"] === undefined || fields["description"] === null
			? null
			: requiredString(fields, "description", { max: 200 }),
		memo: optionalString(fields, "memo", 2000) ?? null,
		lines: fields["lines"] === undefined || fields["lines"] === null ? null : parseLines(fields),
		version: requiredInt(fields, "version"),
	};
}

export function parseKinds(values: readonly string[]): string[] {
	for (const value of values) {
		if (!KINDS.includes(value)) reject("kind", "Pattern", value);
	}

	return [...new Set(values)];
}

export function requiredUuidQuery(value: string | undefined, field: string): string {
	if (value === undefined || value === "") reject(field, "REQUIRED", value);
	if (!UUID.test(value)) reject(field, "Pattern", value);

	return value;
}

export function parsePaging(pageValue: string | undefined, sizeValue: string | undefined) {
	return {
		page: Math.max(0, Number.parseInt(pageValue ?? "0", 10) || 0),
		size: Math.min(100, Math.max(1, Number.parseInt(sizeValue ?? "50", 10) || 50)),
	};
}

export function parseOptionalDate(value: string | undefined, field: string): string | undefined {
	if (value === undefined) return undefined;

	return date({ [field]: value }, field);
}
