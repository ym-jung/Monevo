import "server-only";

import { publicApiGet } from "@/lib/api/server";
import type { CurrencyMeta } from "@/lib/api/types";

export async function loadCurrencies(): Promise<CurrencyMeta[]> {
	try {
		return await publicApiGet<CurrencyMeta[]>("meta/currencies", 3600);
	} catch {

		return [];
	}
}
