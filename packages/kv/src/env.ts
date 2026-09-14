import { createRateLimiter } from "./limiter.ts";
import type { RateLimiter } from "./limiter.ts";

export function tableName(): string | undefined {
	const name = process.env["DYNAMODB_TABLE"];

	return name && name !== "" ? name : undefined;
}

export function rateLimiterFromEnv(): RateLimiter | undefined {
	const table = tableName();
	if (!table) return undefined;

	return createRateLimiter({
		tableName: table,
		onError: (error) => {
			console.error(JSON.stringify({ level: "error", message: "rate limit store unavailable", error: String(error) }));
		},
	});
}
