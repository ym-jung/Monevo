import { ValidationError } from "@monevo/http";
import type { ErrorDetail } from "@monevo/http";

export type Fields = Record<string, unknown>;

export function reject(field: string, issue: string, value: unknown): never {
	const detail: ErrorDetail = {
		field,
		issue,
		value: value === undefined || value === null ? null : String(value),
	};

	throw new ValidationError("VALIDATION_FAILED", [detail]);
}

export function asFields(raw: unknown): Fields {
	if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
		reject("body", "NOT_READABLE", raw);
	}

	return raw as Fields;
}

export function requiredString(
	fields: Fields,
	field: string,
	limits: { max: number; pattern?: RegExp },
): string {
	const value = fields[field];
	if (typeof value !== "string") reject(field, "NotNull", value);

	const trimmed = value.trim();
	if (trimmed === "") reject(field, "NotBlank", value);
	if (trimmed.length > limits.max) reject(field, "Size", value);
	if (limits.pattern && !limits.pattern.test(trimmed)) reject(field, "Pattern", value);

	return trimmed;
}

export function optionalString(fields: Fields, field: string, max: number): string | undefined {
	const value = fields[field];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== "string") reject(field, "Size", value);
	if (value.length > max) reject(field, "Size", value);

	return value;
}

export function requiredInt(fields: Fields, field: string): number {
	const value = fields[field];
	if (!Number.isSafeInteger(value)) reject(field, "NotNull", value);

	return value as number;
}

export function optionalInt(
	fields: Fields,
	field: string,
	range: { min: number; max: number },
): number | undefined {
	const value = fields[field];
	if (value === undefined || value === null) return undefined;
	if (!Number.isSafeInteger(value)) reject(field, "Range", value);

	const asNumber = value as number;
	if (asNumber < range.min) reject(field, "Min", value);
	if (asNumber > range.max) reject(field, "Max", value);

	return asNumber;
}

export function optionalBoolean(fields: Fields, field: string): boolean {
	const value = fields[field];
	if (value === undefined || value === null) return false;
	if (typeof value !== "boolean") reject(field, "Pattern", value);

	return value;
}
