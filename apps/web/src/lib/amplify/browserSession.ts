export const BROWSER_SESSION_COOKIE = "okg-browser-session";

export function hasBrowserSession(value: string | null | undefined): boolean {
	return value === "1";
}
