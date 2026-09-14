import { Hono } from "hono";

import { errorHandler, gateway, notFoundFor, requestId } from "@monevo/http";
import type { RequestVariables } from "@monevo/http";
import { byIp, rateLimiterFromEnv } from "@monevo/kv";
import type { RateLimiter } from "@monevo/kv";

import { seededCurrencyRepository } from "./repository/currency-repository.ts";
import { createRoutes } from "./routes.ts";
import { createCurrencyService } from "./service/currency-service.ts";

export interface AppDeps {
	limiter: RateLimiter | undefined;
	gatewaySecret: string | undefined;
}

export function createApp(deps: AppDeps = { gatewaySecret: undefined, limiter: undefined }): Hono<{ Variables: RequestVariables }> {
	const app = new Hono<{ Variables: RequestVariables }>();

	app.use("*", requestId());
	app.onError(errorHandler);
	app.notFound(notFoundFor(app));

	app.use("*", gateway(deps.gatewaySecret));
	app.use("/api/v1/*", byIp(deps.limiter));

	app.route("/", createRoutes({ currencies: createCurrencyService(seededCurrencyRepository()) }));

	return app;
}

export function createAppFromEnv(): Hono<{ Variables: RequestVariables }> {
	return createApp({
		gatewaySecret: process.env["GATEWAY_SECRET"],
		limiter: rateLimiterFromEnv(),
	});
}
