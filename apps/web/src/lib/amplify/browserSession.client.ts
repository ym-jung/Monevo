"use client";

import { signOut } from "aws-amplify/auth";

import { BROWSER_SESSION_COOKIE } from "./browserSession";

function secureAttribute(): string {
	return window.location.protocol === "https:" ? "; secure" : "";
}

export function startBrowserSession(): void {
	document.cookie = `${BROWSER_SESSION_COOKIE}=1; path=/; samesite=strict${secureAttribute()}`;
}

export async function endBrowserSession(): Promise<void> {
	try {
		await signOut();
	} finally {
		document.cookie = `${BROWSER_SESSION_COOKIE}=; path=/; max-age=0; samesite=strict${secureAttribute()}`;
	}
}
