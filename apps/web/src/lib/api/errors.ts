import type { ErrorDetail } from "./types";

export class ApiError extends Error {
	readonly status: number;
	readonly code: string;
	readonly details: ErrorDetail[];
	readonly traceId?: string;

	constructor(status: number, code: string, message: string, details: ErrorDetail[] = [], traceId?: string) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.code = code;
		this.details = details;
		this.traceId = traceId;
	}

	detailFor(field: string): ErrorDetail | undefined {
		return this.details.find((d) => d.field === field);
	}

	is(...codes: string[]): boolean {
		return codes.includes(this.code);
	}
}

export const ACCOUNT_GATE_CODES = [
	"USER_PENDING_APPROVAL",
	"USER_REJECTED",
	"USER_SUSPENDED",
	"AUTH_USER_NOT_PROVISIONED",
] as const;

export function isAccountGate(error: unknown): error is ApiError {
	return error instanceof ApiError && (ACCOUNT_GATE_CODES as readonly string[]).includes(error.code);
}

export function isConcurrentModification(error: unknown): error is ApiError {
	return error instanceof ApiError && error.code === "CONCURRENT_MODIFICATION";
}
