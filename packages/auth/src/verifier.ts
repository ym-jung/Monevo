import { createRemoteJWKSet, jwtVerify } from "jose";
import type { JWTPayload } from "jose";

import type { CognitoConfig } from "./claims.ts";
import { assertAccessToken, jwksUri } from "./claims.ts";

const JWKS_CACHE_MS = 12 * 60 * 60 * 1000;

export interface TokenVerifier {
	verify(token: string): Promise<JWTPayload>;
}

export function createTokenVerifier(config: CognitoConfig): TokenVerifier {
	const jwks = createRemoteJWKSet(new URL(jwksUri(config.issuer)), {
		cacheMaxAge: JWKS_CACHE_MS,
	});

	return {
		verify: async (token) => {
			const { payload } = await jwtVerify(token, jwks, {
				issuer: config.issuer,
				clockTolerance: config.clockSkewSeconds ?? 60,
			});

			assertAccessToken(payload, config);

			return payload;
		},
	};
}
