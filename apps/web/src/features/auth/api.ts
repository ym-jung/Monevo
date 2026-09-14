import { api } from "@/lib/api/client";
import type { UpdateProfileRequest, UserSummary } from "@/lib/api/types";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/locales";

import { clearPendingProfile, readPendingProfile } from "./pendingProfile";

export function getMe(): Promise<UserSummary> {
	return api.get<UserSummary>("users/me");
}

export function updateMe(body: UpdateProfileRequest): Promise<UserSummary> {
	return api.patch<UserSummary>("users/me", body);
}

export function hasPlaceholderEmail(user: UserSummary): boolean {
	return user.email.endsWith("@unknown.local");
}

function rememberLocale(user: UserSummary): void {
	if (!isLocale(user.locale)) return;
	document.cookie = `${LOCALE_COOKIE}=${user.locale}; path=/; max-age=31536000; samesite=strict`;
}

export async function syncProfileAfterSignIn(email: string): Promise<UserSummary> {
	const me = await getMe();
	rememberLocale(me);

	const pending = readPendingProfile();
	if (!pending && !hasPlaceholderEmail(me)) return me;

	try {

		const updated = await updateMe({ email, ...(pending ?? {}) });
		clearPendingProfile();
		rememberLocale(updated);
		return updated;
	} catch {

		return me;
	}
}
