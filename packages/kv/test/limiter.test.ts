import { describe, expect, it, vi } from "vitest";

import { clientIp, firstForwardedAddress } from "../src/index.ts";
import { byIp, byUser, LIMITS, WINDOW_SECONDS } from "../src/middleware.ts";
import type { RateLimiter } from "../src/limiter.ts";

function counting(counts: number[]): RateLimiter {
	let index = 0;

	return {
		hit: (_key, limit, _window) => {
			const count = counts[index++] ?? 1;

			return Promise.resolve({
				allowed: count <= limit,
				limit,
				remaining: Math.max(0, limit - count),
				retryAfterSeconds: 30,
			});
		},
	};
}

describe("firstForwardedAddress", () => {
	it("takes the client, not the proxies behind it", () => {
		expect(firstForwardedAddress("203.0.113.7, 70.41.3.18")).toBe("203.0.113.7");
	});

	it("treats a blank header as absent", () => {
		expect(firstForwardedAddress("")).toBeUndefined();
		expect(firstForwardedAddress(undefined)).toBeUndefined();
	});
});

describe("clientIp", () => {
	const context = (forwarded: string | undefined, sourceIp: string | undefined) =>
		({
			req: { header: (name: string) => (name === "x-forwarded-for" ? forwarded : undefined) },
			env: { event: { requestContext: { http: { sourceIp } } } },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		}) as any;

	it("believes the forwarded address only from a trusted caller", () => {
		expect(clientIp(context("203.0.113.7", "10.0.0.1"), true)).toBe("203.0.113.7");
	});

	it("ignores a forwarded address an untrusted caller sent", () => {
		expect(clientIp(context("203.0.113.7", "10.0.0.1"), false)).toBe("10.0.0.1");
	});

	it("falls back to the socket address when nothing was forwarded", () => {
		expect(clientIp(context(undefined, "10.0.0.1"), true)).toBe("10.0.0.1");
	});

	it("has a name for the case where neither is known", () => {
		expect(clientIp(context(undefined, undefined), true)).toBe("unknown");
	});
});

describe("byIp", () => {
	const run = async (limiter: RateLimiter) => {
		const headers = new Map<string, string>();
		const next = vi.fn(() => Promise.resolve());
		const c = {
			req: { header: () => undefined },
			env: { event: { requestContext: { http: { sourceIp: "203.0.113.7" } } } },
			get: () => false,
			header: (name: string, value: string) => headers.set(name, value),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (byIp(limiter) as any)(c, next);

		return { headers, next };
	};

	it("passes the request through and reports the budget", async () => {
		const { headers, next } = await run(counting([1]));

		expect(next).toHaveBeenCalled();
		expect(headers.get("x-ratelimit-limit")).toBe(String(LIMITS.ip));
		expect(headers.get("x-ratelimit-remaining")).toBe(String(LIMITS.ip - 1));
		expect(headers.has("retry-after")).toBe(false);
	});

	it("refuses once the window is spent", async () => {
		await expect(run(counting([LIMITS.ip + 1]))).rejects.toMatchObject({ code: "RATE_LIMITED" });
	});
});

describe("byUser", () => {
	const run = async (limiter: RateLimiter, user: { id: string } | undefined) => {
		const headers = new Map<string, string>();
		const next = vi.fn(() => Promise.resolve());
		const c = {
			get: () => user,
			header: (name: string, value: string) => headers.set(name, value),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await (byUser(limiter, "report") as any)(c, next);

		return { headers, next };
	};

	it("counts against the report tier", async () => {
		const { headers } = await run(counting([1]), { id: "u1" });

		expect(headers.get("x-ratelimit-limit")).toBe(String(LIMITS.report));
	});

	it("does nothing when the route left no user behind", async () => {
		const { headers, next } = await run(counting([1]), undefined);

		expect(next).toHaveBeenCalled();
		expect(headers.size).toBe(0);
	});
});

describe("limits", () => {
	it("keeps the tiers the JVM used", () => {
		expect(LIMITS).toEqual({ ip: 600, default: 300, fx: 60, report: 60 });
		expect(WINDOW_SECONDS).toBe(60);
	});
});
