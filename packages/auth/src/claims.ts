import type { JWTPayload } from "jose";

export const TOKEN_USE = "token_use";
export const TOKEN_USE_ACCESS = "access";
export const CLIENT_ID = "client_id";

export interface CognitoConfig {
	issuer: string;
	appClientId: string;
	clockSkewSeconds?: number;
}

export function jwksUri(issuer: string): string {
	return `${issuer.replace(/\/+$/, "")}/.well-known/jwks.json`;
}

export function assertAccessToken(payload: JWTPayload, config: CognitoConfig): void {
	if (payload[TOKEN_USE] !== TOKEN_USE_ACCESS) {
		throw new Error("token_use is not access");
	}
	if (payload[CLIENT_ID] !== config.appClientId) {
		throw new Error("client_id does not match");
	}
	if (typeof payload.sub !== "string" || payload.sub === "") {
		throw new Error("sub is missing");
	}
}
