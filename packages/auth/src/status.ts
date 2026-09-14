import type { ErrorCode } from "@monevo/http";

import type { CurrentUser } from "./principal.ts";

export interface PathMatcher {
	method: string;
	path: string;
}

export const PENDING_ALLOWED: readonly PathMatcher[] = [
	{ method: "GET", path: "/api/v1/users/me" },
	{ method: "PATCH", path: "/api/v1/users/me" },
];

export function statusFailure(
	user: CurrentUser,
	request: PathMatcher,
): ErrorCode | undefined {
	switch (user.status) {
		case "ACTIVE":
			return undefined;
		case "PENDING":
			for (const allowed of PENDING_ALLOWED) {
				if (allowed.method === request.method && allowed.path === request.path) return undefined;
			}

			return "USER_PENDING_APPROVAL";
		case "SUSPENDED":
			return "USER_SUSPENDED";
		case "REJECTED":
			return "USER_REJECTED";
		case "DELETED":
			return "AUTH_USER_NOT_PROVISIONED";
	}
}

export function requiresAdmin(path: string): boolean {
	return path.startsWith("/api/v1/admin");
}
