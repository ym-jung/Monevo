import "server-only";

import { randomUUID } from "node:crypto";

import { currentAccessToken } from "@/lib/amplify/server";
import { gatewaySecret, upstreamUrl } from "@/lib/env";

import { appendQuery, unwrap, type QueryValue } from "./http";
import { serviceForPath } from "./upstream";

export interface ServerRequestOptions {
	query?: Record<string, QueryValue>;
	locale?: string;
}

function apiUrl(path: string, query: ServerRequestOptions["query"]): URL {
	const url = new URL(`/api/v1/${path.replace(/^\/+/, "")}`, upstreamUrl(serviceForPath(path)));
	appendQuery(url.searchParams, query);
	return url;
}

export async function apiGet<T>(path: string, options: ServerRequestOptions = {}): Promise<T> {
	const headers = new Headers({ "x-request-id": randomUUID() });

	const secret = gatewaySecret();
	if (secret) headers.set("x-monevo-gateway", secret);
	if (options.locale) headers.set("accept-language", options.locale);

	const token = await currentAccessToken();
	if (token) headers.set("authorization", `Bearer ${token}`);

	const response = await fetch(apiUrl(path, options.query), { headers, cache: "no-store" });
	return unwrap<T>(response);
}

export async function publicApiGet<T>(path: string, revalidate: number): Promise<T> {
	const headers = new Headers();

	const secret = gatewaySecret();
	if (secret) headers.set("x-monevo-gateway", secret);

	const response = await fetch(apiUrl(path, undefined), { headers, next: { revalidate } });
	return unwrap<T>(response);
}
