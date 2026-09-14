import type { ErrorCode } from "./error-code.ts";

export interface ErrorDetail {
	field: string;
	issue: string;
	value: string | null;
}

export interface ErrorBody {
	code: ErrorCode;
	message: string;
	details: ErrorDetail[];
	traceId: string;
	timestamp: string;
}

export interface ApiSuccess<T> {
	data: T;
	meta?: unknown;
}

export interface ApiFailure {
	error: ErrorBody;
}

export interface PageResponse<T> {
	items: T[];
	page: number;
	size: number;
	totalElements: number;
	totalPages: number;
	hasNext: boolean;
}

export function ok<T>(data: T, meta?: unknown): ApiSuccess<T> {
	return meta === undefined ? { data } : { data, meta };
}

export function fail(
	code: ErrorCode,
	message: string,
	details: ErrorDetail[] = [],
	traceId = "",
): ApiFailure {
	return {
		error: { code, message, details, traceId, timestamp: new Date().toISOString() },
	};
}

export function page<T>(items: T[], pageNumber: number, size: number, totalElements: number): PageResponse<T> {
	const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
	return {
		items,
		page: pageNumber,
		size,
		totalElements,
		totalPages,
		hasNext: pageNumber + 1 < totalPages,
	};
}
