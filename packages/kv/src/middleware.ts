import type { Context, MiddlewareHandler } from "hono";

import { BusinessError } from "@monevo/http";
import type { RequestVariables } from "@monevo/http";

import { clientIp } from "./client-ip.ts";
import type { Decision, RateLimiter } from "./limiter.ts";

export const WINDOW_SECONDS = 60;

export const LIMITS = {
	ip: 600,
	default: 300,
	fx: 60,
	report: 60,
} as const;

export type Tier = keyof typeof LIMITS;

export class RateLimitedError extends BusinessError {}

function applyHeaders(c: Context, decision: Decision): void {
	c.header("x-ratelimit-limit", String(decision.limit));
	c.header("x-ratelimit-remaining", String(decision.remaining));

	if (!decision.allowed) {
		c.header("retry-after", String(decision.retryAfterSeconds));
	}
}

export function byIp<V extends RequestVariables>(
	limiter: RateLimiter | undefined,
): MiddlewareHandler<{ Variables: V }> {
	return async (c, next) => {
		if (!limiter) {
			await next();
			return;
		}

		const ip = clientIp(c, c.get("trustedClient") === true);
		const decision = await limiter.hit(`ip:${ip}`, LIMITS.ip, WINDOW_SECONDS);

		applyHeaders(c, decision);

		if (!decision.allowed) throw new RateLimitedError("RATE_LIMITED");

		await next();
	};
}

export function byUser<V extends RequestVariables & { currentUser: { id: string } }>(
	limiter: RateLimiter | undefined,
	tier: Tier,
): MiddlewareHandler<{ Variables: V }> {
	return async (c, next) => {
		const user = c.get("currentUser") as { id: string } | undefined;
		if (!limiter || !user) {
			await next();
			return;
		}

		const decision = await limiter.hit(`user:${user.id}:${tier}`, LIMITS[tier], WINDOW_SECONDS);

		applyHeaders(c, decision);

		if (!decision.allowed) throw new RateLimitedError("RATE_LIMITED");

		await next();
	};
}
