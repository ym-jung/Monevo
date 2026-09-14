import { Hono } from "hono";

import { authenticate, createPrincipalStore, createTokenVerifier } from "@monevo/auth";
import type { AuthVariables } from "@monevo/auth";
import { createDatabase, newId, resolveDatabaseUrl, transaction } from "@monevo/db";
import type { Database, Executor } from "@monevo/db";
import { errorHandler, gateway, notFoundFor, requestId } from "@monevo/http";
import { byIp, byUser, rateLimiterFromEnv } from "@monevo/kv";
import type { RateLimiter } from "@monevo/kv";

import { createRoutes } from "./routes.ts";
import { createScopeRepository } from "./repository/scope-repository.ts";
import { createSummaryRepository } from "./repository/summary-repository.ts";
import { createSummaryService } from "./service/summary-service.ts";

export interface AppDeps {
	db: Database;
	issuer: string;
	appClientId: string;
	limiter: RateLimiter | undefined;
	gatewaySecret: string | undefined;
}

function repositoriesOn(executor: Executor) {
	return {
		summaries: createSummaryRepository(executor),
		scopes: createScopeRepository(executor),
	};
}

export function buildSummaryService(db: Database) {
	const repositories = repositoriesOn(db);

	return createSummaryService(repositories.summaries, repositories.scopes, (run) =>
		transaction(db, (tx) => run(repositoriesOn(tx))),
	);
}

export function createApp(deps: AppDeps): Hono<{ Variables: AuthVariables }> {
	const app = new Hono<{ Variables: AuthVariables }>();

	app.use("*", requestId());
	app.onError(errorHandler);
	app.notFound(notFoundFor(app));

	app.use("*", gateway(deps.gatewaySecret));
	app.use("/api/v1/*", byIp(deps.limiter));

	app.use(
		"/api/v1/*",
		authenticate({
			verifier: createTokenVerifier({ issuer: deps.issuer, appClientId: deps.appClientId }),
			principals: createPrincipalStore(deps.db, newId),
		}),
	);
	app.use("/api/v1/*", byUser(deps.limiter, "report"));

	app.route("/", createRoutes({ summaries: buildSummaryService(deps.db) }));

	return app;
}

export async function createAppFromEnv(): Promise<Hono<{ Variables: AuthVariables }>> {
	return createApp({
		db: createDatabase({ url: await resolveDatabaseUrl() }),
		issuer: required("COGNITO_ISSUER"),
		appClientId: required("COGNITO_APP_CLIENT_ID"),
		gatewaySecret: process.env["GATEWAY_SECRET"],
		limiter: rateLimiterFromEnv(),
	});
}

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`missing env ${name}`);

	return value;
}
