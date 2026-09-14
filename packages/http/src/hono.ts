import { randomUUID } from "node:crypto";
import type { Context, Hono, MiddlewareHandler, NotFoundHandler } from "hono";

import { fail } from "./envelope.ts";
import { isBusinessError } from "./errors.ts";
import type { Locale } from "./messages/index.ts";
import { localeFromAcceptLanguage, messageFor } from "./messages/index.ts";

export const REQUEST_ID_HEADER = "x-request-id";

export interface RequestVariables {
	requestId: string;
	locale: Locale | undefined;
	trustedClient: boolean;
}

export function requestIdOf<V extends RequestVariables>(c: Context<{ Variables: V }>): string {
	return (c.get("requestId") as string | undefined) ?? "";
}

export function requestId<V extends RequestVariables>(): MiddlewareHandler<{ Variables: V }> {
	return async (c, next) => {
		const incoming = c.req.header(REQUEST_ID_HEADER);
		const id = incoming && incoming.trim() !== "" ? incoming : randomUUID();

		c.set("requestId", id as V["requestId"]);
		c.set("locale", localeFromAcceptLanguage(c.req.header("accept-language")) as V["locale"]);
		c.set("trustedClient", false as V["trustedClient"]);
		c.header(REQUEST_ID_HEADER, id);

		await next();
	};
}

function pathMatches(pattern: string, path: string): boolean {
	const patternSegments = pattern.split("/");
	const pathSegments = path.split("/");
	if (patternSegments.length !== pathSegments.length) return false;

	for (let index = 0; index < patternSegments.length; index += 1) {
		const segment = patternSegments[index] ?? "";
		if (!segment.startsWith(":") && segment !== pathSegments[index]) return false;
	}

	return true;
}

export function notFoundFor<V extends RequestVariables>(app: Hono<{ Variables: V }>): NotFoundHandler<{ Variables: V }> {
	return (c) => {
		let known = false;
		for (const route of app.routes) {
			if (route.method === "ALL" || route.method === c.req.method) continue;
			if (!pathMatches(route.path, c.req.path)) continue;

			known = true;
			break;
		}
		const code = known ? "METHOD_NOT_ALLOWED" : "NOT_FOUND";
		const body = fail(code, messageFor(code, c.get("locale")), [], requestIdOf(c));

		return c.json(body, known ? 405 : 404);
	};
}

export function errorHandler<V extends RequestVariables>(error: Error, c: Context<{ Variables: V }>): Response {
	const locale = c.get("locale");
	const traceId = requestIdOf(c);

	if (isBusinessError(error)) {
		const body = fail(error.code, messageFor(error.code, locale), error.details, traceId);
		return c.json(body, error.status as 400);
	}

	const body = fail("INTERNAL_ERROR", messageFor("INTERNAL_ERROR", locale), [], traceId);
	return c.json(body, 500);
}

export const GATEWAY_HEADER = "x-monevo-gateway";

export function gateway<V extends RequestVariables>(secret: string | undefined): MiddlewareHandler<{ Variables: V }> {
	return async (c, next) => {
		if (!secret) {
			await next();
			return;
		}

		if (c.req.header(GATEWAY_HEADER) !== secret) {
			return c.json(fail("FORBIDDEN", messageFor("FORBIDDEN", c.get("locale")), [], requestIdOf(c)), 403);
		}

		c.set("trustedClient", true as V["trustedClient"]);

		await next();
		return;
	};
}
