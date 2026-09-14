import { ApiError } from "./errors";
import type { ApiFailure, ApiSuccess } from "./types";

export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];

export function appendQuery(params: URLSearchParams, query: Record<string, QueryValue> | undefined): void {
	for (const [key, value] of Object.entries(query ?? {})) {
		if (value === undefined || value === null || value === "") continue;

		if (Array.isArray(value)) {
			for (const item of value) {
				if (item === undefined || item === null || item === "") continue;
				params.append(key, String(item));
			}
			continue;
		}
		params.set(key, String(value));
	}
}

export async function unwrap<T>(response: Response): Promise<T> {
	if (!response.ok) throw await toApiError(response);
	if (response.status === 204) return undefined as T;

	const payload = (await response.json()) as ApiSuccess<T>;
	return payload.data;
}

async function toApiError(response: Response): Promise<ApiError> {
	const fallback = () =>
		new ApiError(response.status, "INTERNAL_ERROR", response.statusText || "Request failed");

	let body: ApiFailure | undefined;
	try {
		body = (await response.json()) as ApiFailure;
	} catch {
		return fallback();
	}

	const error = body?.error;
	if (!error) return fallback();

	return new ApiError(response.status, error.code, error.message, error.details ?? [], error.traceId);
}
