import {notFound} from "next/navigation";

import {LedgerWindow} from "@/features/ledger/LedgerWindow";
import {monthOf, monthRange} from "@/features/ledger/monthNav";
import {requireActiveLedgerContext} from "@/features/ledger/server";
import {PAGE_SIZE} from "@/features/journal/api";
import {apiGet} from "@/lib/api/server";
import type {
    AccountDetail, CategoryNode, JournalEntrySummary, MonthlySummary, PageResponse,
} from "@/lib/api/types";

export default async function LedgerPage({params}: { params: Promise<{ ledgerId: string }> }) {
    const {ledgerId} = await params;
    const {user, ledgers} = await requireActiveLedgerContext();

    if (!ledgers.some((l) => l.id === ledgerId)) notFound();

    const month = monthOf();
    const range = monthRange(month);

    const [accounts, categories, summary, page] = await Promise.all([
        apiGet<AccountDetail[]>("accounts", {query: {ledgerId, includeArchived: false}}),
        apiGet<CategoryNode[]>(`ledgers/${ledgerId}/categories`),
        apiGet<MonthlySummary>(`ledgers/${ledgerId}/summary`, {query: {month}}).catch(() => null),
        apiGet<PageResponse<JournalEntrySummary>>("journal-entries", {
            query: {ledgerId, from: range.from, to: range.to, page: 0, size: PAGE_SIZE},
        }),
    ]);

    return (
        <LedgerWindow
            ledgers={ledgers}
            initialLedgerId={ledgerId}
            viewer={user}
            initial={{month, accounts, categories, summary, page}}
        />
    );
}
