import type {
	AccountCreateRequest,
	AccountUpdateRequest,
	CategoryCreateRequest,
	CategoryUpdateRequest,
} from "@monevo/contracts";

import {
	asFields,
	optionalInt,
	optionalString,
	reject,
	requiredInt,
	requiredString,
} from "./validate.ts";
import type { Fields } from "./validate.ts";

const CURRENCY = /^[A-Z]{3}$/;
const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const ACCOUNT_TYPES = ["BANK", "CASH", "E_MONEY", "CREDIT_CARD"] as const;
const CATEGORY_KINDS = ["EXPENSE", "INCOME"] as const;

function oneOf<T extends string>(
	fields: Fields,
	field: string,
	allowed: readonly T[],
): T {
	const value = fields[field];
	if (typeof value !== "string" || !allowed.includes(value as T)) {
		reject(field, "Pattern", value);
	}

	return value as T;
}

function uuidList(fields: Fields, field: string, max: number): string[] {
	const value = fields[field];
	if (value === undefined || value === null) return [];
	if (!Array.isArray(value)) reject(field, "Size", value);
	if (value.length > max) reject(field, "Size", value.length);

	for (const entry of value) {
		if (typeof entry !== "string" || !UUID.test(entry)) reject(field, "Pattern", entry);
	}

	return [...new Set(value as string[])];
}

function optionalUuid(fields: Fields, field: string): string | undefined {
	const value = fields[field];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "string" || !UUID.test(value)) reject(field, "Pattern", value);

	return value;
}

function optionalBooleanOrUndefined(fields: Fields, field: string): boolean | undefined {
	const value = fields[field];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "boolean") reject(field, "Pattern", value);

	return value;
}

export function parseAccountCreate(raw: unknown): AccountCreateRequest {
	const fields = asFields(raw);

	return {
		name: requiredString(fields, "name", { max: 50 }),
		type: oneOf(fields, "type", ACCOUNT_TYPES),
		currency: requiredString(fields, "currency", { max: 3, pattern: CURRENCY }),
		ledgerIds: uuidList(fields, "ledgerIds", 50),
		openingBalanceMinor: fields["openingBalanceMinor"] === undefined
			? 0
			: requiredInt(fields, "openingBalanceMinor"),
		memo: optionalString(fields, "memo", 200) ?? null,
	};
}

export function parseAccountUpdate(raw: unknown): AccountUpdateRequest {
	const fields = asFields(raw);

	return {
		name: fields["name"] === undefined || fields["name"] === null
			? null
			: requiredString(fields, "name", { max: 50 }),
		memo: optionalString(fields, "memo", 200) ?? null,
		archived: optionalBooleanOrUndefined(fields, "archived") ?? null,
		version: requiredInt(fields, "version"),
	};
}

export function parseCategoryCreate(raw: unknown): CategoryCreateRequest {
	const fields = asFields(raw);

	return {
		name: requiredString(fields, "name", { max: 40 }),
		kind: oneOf(fields, "kind", CATEGORY_KINDS),
		parentId: optionalUuid(fields, "parentId") ?? null,
	};
}

export function parseCategoryUpdate(raw: unknown): CategoryUpdateRequest {
	const fields = asFields(raw);

	return {
		name: fields["name"] === undefined || fields["name"] === null
			? null
			: requiredString(fields, "name", { max: 40 }),
		sortOrder: optionalInt(fields, "sortOrder", { min: 0, max: 32767 }) ?? null,
	};
}
