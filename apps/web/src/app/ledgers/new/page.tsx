import {redirect} from "next/navigation";

import {EmptyLedgerWindow} from "@/features/ledger/EmptyLedgerWindow";
import {requireActiveLedgerContext} from "@/features/ledger/server";

export default async function NoLedgersPage() {
    const {user, ledgers} = await requireActiveLedgerContext();
    if (ledgers.length) redirect(`/ledgers/${ledgers[0].id}`);
    return <EmptyLedgerWindow viewer={user}/>;
}
