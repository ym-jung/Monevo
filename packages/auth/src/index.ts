export { assertAccessToken, jwksUri } from "./claims.ts";
export type { CognitoConfig } from "./claims.ts";

export { authenticate, UnauthenticatedError } from "./middleware.ts";
export type { AuthDeps, AuthVariables } from "./middleware.ts";

export { createPrincipalStore, displayNameFrom, placeholderEmail } from "./principal.ts";
export type { CurrentUser, PrincipalStore, UserRole, UserStatus } from "./principal.ts";

export { PENDING_ALLOWED, requiresAdmin, statusFailure } from "./status.ts";
export type { PathMatcher } from "./status.ts";

export { createTokenVerifier } from "./verifier.ts";
export type { TokenVerifier } from "./verifier.ts";
