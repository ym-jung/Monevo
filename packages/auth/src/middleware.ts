import type { MiddlewareHandler } from "hono";

import { BusinessError, ForbiddenError } from "@monevo/http";
import type { RequestVariables } from "@monevo/http";

import type { CurrentUser, PrincipalStore } from "./principal.ts";
import { requiresAdmin, statusFailure } from "./status.ts";
import type { TokenVerifier } from "./verifier.ts";

export interface AuthVariables extends RequestVariables {
	currentUser: CurrentUser;
}

export class UnauthenticatedError extends BusinessError {}

export interface AuthDeps {
	verifier: TokenVerifier;
	principals: PrincipalStore;
}

function bearerToken(header: string | undefined): string | undefined {
	if (!header) return undefined;

	const [scheme, value] = header.split(" ");
	return scheme?.toLowerCase() === "bearer" && value ? value : undefined;
}

export function authenticate(deps: AuthDeps): MiddlewareHandler<{ Variables: AuthVariables }> {
	return async (c, next) => {
		const token = bearerToken(c.req.header("authorization"));
		if (!token) throw new UnauthenticatedError("UNAUTHENTICATED");

		let sub: string;
		let email: string | undefined;
		try {
			const payload = await deps.verifier.verify(token);
			sub = payload.sub as string;
			email = typeof payload["email"] === "string" ? payload["email"] : undefined;
		} catch {
			throw new UnauthenticatedError("TOKEN_INVALID");
		}

		const user = await deps.principals.findOrProvision(sub, email);
		if (!user) throw new UnauthenticatedError("AUTH_USER_NOT_PROVISIONED");

		const failure = statusFailure(user, { method: c.req.method, path: c.req.path });
		if (failure) throw new ForbiddenError(failure);

		if (requiresAdmin(c.req.path) && user.role !== "ADMIN") {
			throw new ForbiddenError("ADMIN_REQUIRED");
		}

		c.set("currentUser", user);

		await next();
	};
}
