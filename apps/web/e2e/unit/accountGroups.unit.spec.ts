import { expect, test } from "@playwright/test";

import { groupAccounts } from "@/features/account/grouping";
import type { AccountDetail } from "@/lib/api/types";

const LEDGER = "ledger-1";

function account(id: string, over: Partial<AccountDetail> = {}): AccountDetail {
    return {
        id,
        name: id,
        type: "BANK",
        currency: "KRW",
        nature: "ASSET",
        subtype: "REAL",
        ownerUserId: "me",
        ownerDisplayName: "Me",
        ledgerIds: [LEDGER],
        balanceMinor: 0,
        archived: false,
        version: 0,
        ...over,
    };
}

test("an account linked to this ledger stays in the linked section only", () => {
    const mine = account("a");
    const groups = groupAccounts([mine], [mine]);

    expect(groups.linked.map((a) => a.id)).toEqual(["a"]);
    expect(groups.unlinked).toEqual([]);
    expect(groups.archived).toEqual([]);
});

test("an account linked only to another ledger is offered for linking", () => {
    const mine = account("a", { ledgerIds: ["ledger-2"] });
    const groups = groupAccounts([], [mine]);

    expect(groups.unlinked.map((a) => a.id)).toEqual(["a"]);
    expect(groups.linked).toEqual([]);
});

test("an account linked to no ledger is offered for linking", () => {
    const mine = account("a", { ledgerIds: [] });

    expect(groupAccounts([], [mine]).unlinked.map((a) => a.id)).toEqual(["a"]);
});

test("an archived account still linked here shows as archived, not twice", () => {
    const mine = account("a", { archived: true });
    const groups = groupAccounts([mine], [mine]);

    expect(groups.archived.map((a) => a.id)).toEqual(["a"]);
    expect(groups.linked).toEqual([]);
    expect(groups.unlinked).toEqual([]);
});

test("an archived unlinked account is still reachable — the case that used to vanish", () => {
    const mine = account("a", { archived: true, ledgerIds: [] });
    const groups = groupAccounts([], [mine]);

    expect(groups.archived.map((a) => a.id)).toEqual(["a"]);
});

test("every owned account lands in exactly one section", () => {
    const owned = [
        account("linked"),
        account("elsewhere", { ledgerIds: ["ledger-2"] }),
        account("loose", { ledgerIds: [] }),
        account("archived", { archived: true, ledgerIds: [] }),
    ];
    const groups = groupAccounts([owned[0]], owned);
    const ids = [...groups.linked, ...groups.unlinked, ...groups.archived].map((a) => a.id);

    expect(ids.sort()).toEqual(["archived", "elsewhere", "linked", "loose"]);
});

test("an account shared by another member stays visible and is never offered for linking", () => {
    const theirs = account("shared", { ownerUserId: "other", ownerDisplayName: "Other" });
    const groups = groupAccounts([theirs], []);

    expect(groups.linked.map((a) => a.id)).toEqual(["shared"]);
    expect(groups.unlinked).toEqual([]);
    expect(groups.archived).toEqual([]);
});
