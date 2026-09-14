import { appendQuery, unwrap, type QueryValue } from "./http";

const BFF_BASE = "/api/bff";

export interface RequestOptions {
	query?: Record<string, QueryValue>;
	signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
	const url = `${BFF_BASE}/${path.replace(/^\/+/, "")}`;
	if (!query) return url;

	const params = new URLSearchParams();
	appendQuery(params, query);

	const qs = params.toString();
	return qs ? `${url}?${qs}` : url;
}

async function send<T>(method: string, path: string, body?: unknown, options?: RequestOptions): Promise<T> {
	const response = await fetch(buildUrl(path, options?.query), {
		method,
		headers: body === undefined ? undefined : { "content-type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: options?.signal,
	});

	return unwrap<T>(response);
}

export const api = {
	get: <T>(path: string, options?: RequestOptions) => send<T>("GET", path, undefined, options),
	post: <T>(path: string, body?: unknown, options?: RequestOptions) => send<T>("POST", path, body, options),
	put: <T>(path: string, body?: unknown, options?: RequestOptions) => send<T>("PUT", path, body, options),
	patch: <T>(path: string, body?: unknown, options?: RequestOptions) => send<T>("PATCH", path, body, options),
	delete: <T = void>(path: string, options?: RequestOptions) => send<T>("DELETE", path, undefined, options),
};
