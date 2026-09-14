import type {
	RejectUserRequest,
	UpdateProfileRequest,
	UpdateUserStatusRequest,
} from "@monevo/contracts";

import { asFields, optionalString, reject, requiredString } from "./validate.ts";
import type { Fields } from "./validate.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCY = /^[A-Z]{3}$/;

function trimmedOrNull(fields: Fields, field: string, max: number): string | null {
	const value = fields[field];
	if (value === undefined || value === null) return null;

	return requiredString(fields, field, { max });
}

export function parseUpdateProfile(raw: unknown): UpdateProfileRequest {
	const fields = asFields(raw);

	const email = fields["email"];
	if (email !== undefined && email !== null) {
		if (typeof email !== "string" || !EMAIL.test(email)) reject("email", "Email", email);
		if (email.length > 255) reject("email", "Size", email);
	}

	const currency = fields["displayCurrency"];
	if (currency !== undefined && currency !== null) {
		if (typeof currency !== "string" || !CURRENCY.test(currency)) {
			reject("displayCurrency", "Size", currency);
		}
	}

	return {
		email: (email as string | undefined) ?? null,
		displayName: trimmedOrNull(fields, "displayName", 60),
		displayCurrency: (currency as string | undefined) ?? null,
		locale: optionalString(fields, "locale", 10) ?? null,
		timezone: optionalString(fields, "timezone", 64) ?? null,
	};
}

export function parseRejectUser(raw: unknown): RejectUserRequest {
	const fields = asFields(raw ?? {});

	return { reason: optionalString(fields, "reason", 200) ?? null };
}

export function parseUpdateUserStatus(raw: unknown): UpdateUserStatusRequest {
	const fields = asFields(raw);
	const status = fields["status"];

	if (status !== "SUSPENDED" && status !== "ACTIVE") {
		reject("status", "Pattern", status);
	}

	return { status };
}

export function parsePaging(page: string | undefined, size: string | undefined) {
	const parsed = {
		page: Math.max(0, Number.parseInt(page ?? "0", 10) || 0),
		size: Number.parseInt(size ?? "50", 10) || 50,
	};

	return { page: parsed.page, size: Math.min(100, Math.max(1, parsed.size)) };
}
