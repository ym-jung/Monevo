import "server-only";

import { requireActiveUser } from "@/features/auth/session";
import { apiGet } from "@/lib/api/server";
import type { LedgerDetail, UserSummary } from "@/lib/api/types";

export async function requireActiveLedgerContext(): Promise<{
	user: UserSummary;
	ledgers: LedgerDetail[];
}> {
	const userPromise = requireActiveUser();

	try {
		const [user, ledgers] = await Promise.all([
			userPromise,
			apiGet<LedgerDetail[]>("ledgers"),
		]);
		return { user, ledgers };
	} catch (error) {

		await userPromise;
		throw error;
	}
}
