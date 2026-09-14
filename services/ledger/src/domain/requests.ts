import type {
	LedgerCreateRequest,
	LedgerInviteRequest,
	LedgerUpdateRequest,
} from "@monevo/contracts";

import {
	asFields,
	optionalBoolean,
	optionalInt,
	requiredInt,
	requiredString,
} from "./validate.ts";

const CURRENCY = /^[A-Z]{3}$/;

export function parseLedgerCreate(raw: unknown): LedgerCreateRequest {
	const fields = asFields(raw);

	return {
		name: requiredString(fields, "name", { max: 100 }),
		currency: requiredString(fields, "currency", { max: 3, pattern: CURRENCY }),
		timezone: requiredString(fields, "timezone", { max: 64 }),
		confirmCurrencyIrreversible: optionalBoolean(fields, "confirmCurrencyIrreversible"),
	};
}

export function parseLedgerUpdate(raw: unknown): LedgerUpdateRequest {
	const fields = asFields(raw);

	return {
		name: requiredString(fields, "name", { max: 100 }),
		version: requiredInt(fields, "version"),
	};
}

export function parseInviteRequest(raw: unknown): LedgerInviteRequest {
	const fields = asFields(raw ?? {});

	return {
		expiresInDays: optionalInt(fields, "expiresInDays", { min: 1, max: 30 }),
		maxUses: optionalInt(fields, "maxUses", { min: 1, max: 10 }),
	};
}
