import { expect, test } from "@playwright/test";

import { buildEntryLines, canSaveEntry, type EntryDraft } from "@/features/journal/entryLines";

const CARD = "account-card";
const BANK = "account-bank";
const FOOD = "category-food";
const HOUSE = "category-house";
const SALARY = "category-salary";

function draft(over: Partial<EntryDraft> = {}): EntryDraft {
    return {
        kind: "EXPENSE",
        description: "lunch",
        date: "2026-03-05",
        accountId: CARD,
        counterAccountId: "",
        availableCounterIds: [BANK],
        availableCategoryIds: [FOOD, HOUSE],
        amountMinor: 1000,
        counterMinor: 0,
        exchange: false,
        splits: [{ categoryId: FOOD, amountMinor: 1000, memo: "" }],
        ...over,
    };
}

test("an expense debits the category and credits the account it was paid from", () => {
    expect(buildEntryLines(draft())).toEqual([
        { side: "DEBIT", accountId: FOOD, amountMinor: 1000, memo: undefined },
        { side: "CREDIT", accountId: CARD, amountMinor: 1000 },
    ]);
});

test("income reverses the sides", () => {
    const lines = buildEntryLines(draft({
        kind: "INCOME",
        accountId: BANK,
        availableCategoryIds: [SALARY],
        splits: [{ categoryId: SALARY, amountMinor: 50000, memo: "" }],
        amountMinor: 50000,
    }));

    expect(lines).toEqual([
        { side: "DEBIT", accountId: BANK, amountMinor: 50000 },
        { side: "CREDIT", accountId: SALARY, amountMinor: 50000, memo: undefined },
    ]);
});

test("a transfer credits the account the money leaves", () => {
    const lines = buildEntryLines(draft({ kind: "TRANSFER", counterAccountId: BANK, amountMinor: 30000 }));

    expect(lines).toEqual([
        { side: "DEBIT", accountId: BANK, amountMinor: 30000 },
        { side: "CREDIT", accountId: CARD, amountMinor: 30000 },
    ]);
});

test("a cross-currency transfer sends the amount each side is actually in", () => {
    const lines = buildEntryLines(draft({
        kind: "TRANSFER",
        counterAccountId: BANK,
        amountMinor: 10000,
        counterMinor: 6700,
        exchange: true,
    }));

    expect(lines[0]).toEqual({ side: "DEBIT", accountId: BANK, amountMinor: 6700 });
    expect(lines[1]).toEqual({ side: "CREDIT", accountId: CARD, amountMinor: 10000 });
});

test("a split debits each category for its own share and credits the account once", () => {
    const lines = buildEntryLines(draft({
        amountMinor: 1000,
        splits: [
            { categoryId: FOOD, amountMinor: 700, memo: "beans" },
            { categoryId: HOUSE, amountMinor: 300, memo: "" },
        ],
    }));

    expect(lines).toEqual([
        { side: "DEBIT", accountId: FOOD, amountMinor: 700, memo: "beans" },
        { side: "DEBIT", accountId: HOUSE, amountMinor: 300, memo: undefined },
        { side: "CREDIT", accountId: CARD, amountMinor: 1000 },
    ]);
});

test("one leg takes the whole amount, whatever its own field says", () => {
    const lines = buildEntryLines(draft({
        amountMinor: 1000,
        splits: [{ categoryId: FOOD, amountMinor: 7, memo: "" }],
    }));

    expect(lines[0].amountMinor).toBe(1000);
});

test("an empty picker falls back to the first option rather than saving a blank id", () => {
    const lines = buildEntryLines(draft({ splits: [{ categoryId: "", amountMinor: 1000, memo: "" }] }));
    expect(lines[0].accountId).toBe(FOOD);

    const transfer = buildEntryLines(draft({ kind: "TRANSFER", counterAccountId: "" }));
    expect(transfer[0].accountId).toBe(BANK);
});

test("saving is refused until the entry could actually balance", () => {
    expect(canSaveEntry(draft())).toBe(true);

    expect(canSaveEntry(draft({ amountMinor: 0 }))).toBe(false);
    expect(canSaveEntry(draft({ description: "   " }))).toBe(false);
    expect(canSaveEntry(draft({ date: "2026-3-5" }))).toBe(false);
    expect(canSaveEntry(draft({ availableCategoryIds: [] }))).toBe(false);

    expect(canSaveEntry(draft({
        splits: [
            { categoryId: FOOD, amountMinor: 1000, memo: "" },
            { categoryId: HOUSE, amountMinor: 0, memo: "" },
        ],
    }))).toBe(false);

    expect(canSaveEntry(draft({ kind: "TRANSFER", availableCounterIds: [] }))).toBe(false);
    expect(canSaveEntry(draft({ kind: "TRANSFER", exchange: true, counterMinor: 0 }))).toBe(false);
    expect(canSaveEntry(draft({ kind: "TRANSFER", exchange: true, counterMinor: 6700 }))).toBe(true);
});
