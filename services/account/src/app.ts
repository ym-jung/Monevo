import { Hono } from "hono";

import { authenticate, createPrincipalStore, createTokenVerifier } from "@monevo/auth";
import type { AuthVariables } from "@monevo/auth";
import { createDatabase, newId, resolveDatabaseUrl, transaction } from "@monevo/db";
import type { Database, Executor } from "@monevo/db";
import { errorHandler, gateway, notFoundFor, requestId } from "@monevo/http";
import { byIp, byUser, rateLimiterFromEnv } from "@monevo/kv";
import type { RateLimiter } from "@monevo/kv";

import { createAccountRepository } from "./repository/account-repository.ts";
import { createScopeRepository } from "./repository/scope-repository.ts";
import { createRoutes } from "./routes.ts";
import { createAccessChecker } from "./service/access-checker.ts";
import { createAccountService } from "./service/account-service.ts";
import { createCategoryService } from "./service/category-service.ts";

export interface AppDeps {
	db: Database;
	issuer: string;
	appClientId: string;
	limiter: RateLimiter | undefined;
	gatewaySecret: string | undefined;
}

function repositoriesOn(executor: Executor) {
	return {
		accounts: createAccountRepository(executor),
		scopes: createScopeRepository(executor),
	};
}

export function buildServices(db: Database) {
	const repositories = repositoriesOn(db);
	const runInTransaction = <T>(run: (scoped: ReturnType<typeof repositoriesOn>) => Promise<T>) =>
		transaction(db, (tx) => run(repositoriesOn(tx)));

	const access = createAccessChecker(repositories.accounts, repositories.scopes);

	return {
		accounts: createAccountService(
			repositories.accounts,
			repositories.scopes,
			access,
			runInTransaction,
		),
		categories: createCategoryService(repositories.accounts, repositories.scopes, access),
	};
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
	app.use("/api/v1/*", byUser(deps.limiter, "default"));

	app.route("/", createRoutes(buildServices(deps.db)));

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
