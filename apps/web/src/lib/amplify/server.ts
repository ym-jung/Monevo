import "server-only";

import { fetchAuthSession } from "aws-amplify/auth/server";
import { cookies } from "next/headers";
import { cache } from "react";

import { BROWSER_SESSION_COOKIE, hasBrowserSession } from "./browserSession";
import { amplifyServerRunner } from "./runner";

async function isBrowserSessionActive(): Promise<boolean> {
	const jar = await cookies();
	return hasBrowserSession(jar.get(BROWSER_SESSION_COOKIE)?.value);
}

export const currentAccessToken = cache(async (): Promise<string | undefined> => {
	if (!(await isBrowserSessionActive())) return undefined;

	try {
		return await amplifyServerRunner().runWithAmplifyServerContext({
			nextServerContext: { cookies },
			operation: async (contextSpec) => {
				const session = await fetchAuthSession(contextSpec);
				return session.tokens?.accessToken?.toString();
			},
		});
	} catch {

		return undefined;
	}
});

export const identityEmail = cache(async (): Promise<string | undefined> => {
	if (!(await isBrowserSessionActive())) return undefined;

	try {
		return await amplifyServerRunner().runWithAmplifyServerContext({
			nextServerContext: { cookies },
			operation: async (contextSpec) => {
				const session = await fetchAuthSession(contextSpec);
				const email = session.tokens?.idToken?.payload?.email;
				return typeof email === "string" ? email : undefined;
			},
		});
	} catch {
		return undefined;
	}
});
