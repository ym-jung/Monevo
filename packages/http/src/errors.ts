import type { ErrorCode } from "./error-code.ts";
import { statusOf } from "./error-code.ts";
import type { ErrorDetail } from "./envelope.ts";

export class BusinessError extends Error {
	readonly code: ErrorCode;
	readonly details: ErrorDetail[];

	constructor(code: ErrorCode, details: ErrorDetail[] = []) {
		super(code);
		this.name = new.target.name;
		this.code = code;
		this.details = details;
	}

	get status(): number {
		return statusOf(this.code);
	}
}

export class ValidationError extends BusinessError {}
export class NotFoundError extends BusinessError {}
export class ForbiddenError extends BusinessError {}
export class ConflictError extends BusinessError {}
export class GoneError extends BusinessError {}

export function isBusinessError(value: unknown): value is BusinessError {
	return value instanceof BusinessError;
}
