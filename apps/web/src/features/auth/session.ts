import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { currentAccessToken, identityEmail } from "@/lib/amplify/server";
import { ApiError } from "@/lib/api/errors";
import { apiGet } from "@/lib/api/server";
import type { UserStatus, UserSummary } from "@/lib/api/types";

export type GateStatus = Exclude<UserStatus, "ACTIVE">;

export type Session =
	| { kind: "signed-out" }
	| { kind: "active"; user: UserSummary }
	| { kind: "gated"; status: GateStatus; user: UserSummary | null };

const GATE_BY_CODE: Record<string, GateStatus> = {
	USER_PENDING_APPROVAL: "PENDING",
	USER_SUSPENDED: "SUSPENDED",
	USER_REJECTED: "REJECTED",

	AUTH_USER_NOT_PROVISIONED: "DELETED",
};

export const currentSession = cache(async (): Promise<Session> => {
	if (!(await currentAccessToken())) return { kind: "signed-out" };

	try {
		const user = await apiGet<UserSummary>("users/me");
		return user.status === "ACTIVE"
			? { kind: "active", user }
			: { kind: "gated", status: user.status, user };
	} catch (error) {
		if (!(error instanceof ApiError)) throw error;

		const status = GATE_BY_CODE[error.code];
		if (status) return { kind: "gated", status, user: null };

		if (error.status === 401) return { kind: "signed-out" };
		throw error;
	}
});

export async function requireActiveUser(): Promise<UserSummary> {
	const session = await currentSession();
	if (session.kind === "signed-out") redirect("/sign-in");
	if (session.kind === "gated") redirect("/gate");
	return session.user;
}

export async function requireGateContext(): Promise<{ session: Session; email: string }> {
	const session = await currentSession();
	if (session.kind === "signed-out") redirect("/sign-in");
	const email = session.user?.email ?? (await identityEmail()) ?? "";
	return { session, email };
}
