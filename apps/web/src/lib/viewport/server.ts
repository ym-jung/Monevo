import "server-only";

import { headers } from "next/headers";

export async function resolvePhone(): Promise<boolean> {
	const h = await headers();

	const hint = h.get("sec-ch-ua-mobile");
	if (hint === "?1") return true;
	if (hint === "?0") return false;

	const ua = h.get("user-agent") ?? "";
	return /Android|iPhone|iPod|Windows Phone|IEMobile|Opera Mini/i.test(ua);
}
