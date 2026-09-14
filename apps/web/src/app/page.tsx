import { redirect } from "next/navigation";

import { requireActiveLedgerContext } from "@/features/ledger/server";

export default async function Home() {
	const { ledgers } = await requireActiveLedgerContext();
	redirect(ledgers.length ? `/ledgers/${ledgers[0].id}` : "/ledgers/new");
}
