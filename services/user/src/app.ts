import { Hono } from "hono";

import { authenticate, createPrincipalStore, createTokenVerifier } from "@monevo/auth";
import type { AuthVariables, PrincipalStore } from "@monevo/auth";
import { createDatabase, newId, resolveDatabaseUrl } from "@monevo/db";
import type { Database } from "@monevo/db";
import { errorHandler, gateway, notFoundFor, requestId } from "@monevo/http";
import { byIp, byUser, rateLimiterFromEnv } from "@monevo/kv";
import type { RateLimiter } from "@monevo/kv";

import { createUserRepository } from "./repository/user-repository.ts";
import { createRoutes } from "./routes.ts";
import { createAdminService } from "./service/admin-service.ts";
import { createProfileService } from "./service/profile-service.ts";

export interface AppDeps {
	db: Database;
	issuer: string;
	appClientId: string;
	limiter: RateLimiter | undefined;
	gatewaySecret: string | undefined;
}

export function buildServices(db: Database, principals: PrincipalStore) {
	const users = createUserRepository(db);

	return {
		profiles: createProfileService(users, principals),
		admin: createAdminService(users, principals),
	};
}

export function createApp(deps: AppDeps): Hono<{ Variables: AuthVariables }> {
	const app = new Hono<{ Variables: AuthVariables }>();
	const principals = createPrincipalStore(deps.db, newId);

	app.use("*", requestId());
	app.onError(errorHandler);
	app.notFound(notFoundFor(app));

	app.use("*", gateway(deps.gatewaySecret));
	app.use("/api/v1/*", byIp(deps.limiter));

	app.use(
		"/api/v1/*",
		authenticate({
			verifier: createTokenVerifier({ issuer: deps.issuer, appClientId: deps.appClientId }),
			principals,
		}),
	);
	app.use("/api/v1/*", byUser(deps.limiter, "default"));

	app.route("/", createRoutes(buildServices(deps.db, principals)));

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
