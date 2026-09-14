import { type NextRequest, NextResponse } from "next/server";

import { fetchAuthSession } from "aws-amplify/auth/server";

import { BROWSER_SESSION_COOKIE, hasBrowserSession } from "@/lib/amplify/browserSession";
import { amplifyServerRunner } from "@/lib/amplify/runner";

const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/confirm", "/ds"];

function redirectTo(request: NextRequest, path: string, search = ""): NextResponse {
	const to = request.nextUrl.clone();
	to.pathname = path;
	to.search = search;
	return NextResponse.redirect(to);
}

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const response = NextResponse.next();

	let signedIn = false;
	if (hasBrowserSession(request.cookies.get(BROWSER_SESSION_COOKIE)?.value)) {
		try {
			signedIn = await amplifyServerRunner().runWithAmplifyServerContext({
				nextServerContext: { request, response },
				operation: async (contextSpec) => {
					const session = await fetchAuthSession(contextSpec);
					return session.tokens?.accessToken !== undefined;
				},
			});
		} catch {
			signedIn = false;
		}
	}

	const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

	if (!signedIn && !isPublic) {

		const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
		return redirectTo(request, "/sign-in", next);
	}

	if (signedIn && isPublic && pathname !== "/ds") {
		return redirectTo(request, "/");
	}

	return response;
}

export const config = {
    runtime: "nodejs",
    matcher: [
        "/((?!api/bff|_next/static|_next/image|icons|favicon.ico).*)",
    ],
};
