import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, type Locator, type Page } from "@playwright/test";

export const LEDGER_ID = readFileSync(path.join(__dirname, ".ledger-id"), "utf8").trim();

export async function openLedger(page: Page) {
    await page.goto(`/ledgers/${LEDGER_ID}`);
    await expect(page.getByRole("heading", { name: "zz-e2e", level: 1 })).toBeVisible();
}

export async function currentMonthLabel(page: Page) {
    return (await page.getByRole("button", { name: "Pick a month" }).innerText()).trim();
}

export function slipRow(page: Page, particulars: string) {
    return page.getByRole("main").locator("[role='row'], tr, li, div").filter({ hasText: particulars }).first();
}

type EntryFields = {
    kind?: "Expense" | "Income" | "Transfer";
    particulars: string;
    amount: string;
    account?: string;
    category?: string;
    counterAccount?: string;
};

export async function addEntry(page: Page, fields: EntryFields) {
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("heading", { name: "New entry" })).toBeVisible();

    if (fields.kind && fields.kind !== "Expense") {
        await page.getByRole("tab", { name: fields.kind }).click();
    }

    await particularsInput(page).fill(fields.particulars);

    const combos = page.getByRole("combobox");
    if (fields.account) await choose(combos.first(), fields.account);
    const second = fields.counterAccount ?? fields.category;
    if (second) await choose(combos.nth(1), second);

    await page.getByPlaceholder("0", { exact: true }).first().fill(fields.amount);

    const save = page.getByRole("button", { name: "Record entry" });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(page.getByRole("heading", { name: "New entry" })).toBeHidden();
}

export function particularsInput(page: Page) {
    return page.getByRole("textbox", { name: "Particulars" });
}

export function sheetTitle(page: Page, title: string) {
    return page.getByRole("heading", { name: title });
}

export async function entryIdByDescription(page: Page, description: string) {
    const response = await page.request.get(`/api/bff/journal-entries?ledgerId=${LEDGER_ID}&size=50`);
    const body = await response.json();
    const match = body.data.items.find((item: { description: string }) => item.description === description);
    expect(match, `no entry named "${description}"`).toBeDefined();
    return match.id as string;
}

export async function openEntry(page: Page, particulars: string) {
    await page.getByRole("main").getByText(particulars, { exact: false }).first().click();
    const inspector = page.getByRole("complementary");
    await expect(inspector.getByRole("heading", { name: particulars })).toBeVisible();
    return inspector;
}

export async function deleteEntry(page: Page, particulars: string) {
    const inspector = await openEntry(page, particulars);
    await inspector.getByRole("button", { name: "Edit entry" }).click();
    await expect(page.getByRole("heading", { name: "Edit entry" })).toBeVisible();

    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const confirm = page.getByRole("button", { name: /delete/i }).last();
    if (await confirm.isEnabled().catch(() => false)) await confirm.click();

    await expect(page.getByRole("heading", { name: "Edit entry" })).toBeHidden();
    await expect(page.getByRole("main").getByText(particulars, { exact: false })).toHaveCount(0);
}

async function choose(select: Locator, needle: string) {
    await select.click();
    const option = select.page().getByRole("option")
        .filter({ hasText: new RegExp(`^${escapeRe(needle)}`, "i") }).first();
    await expect(option).toBeVisible();
    await option.click();
    await expect(select).toContainText(new RegExp(escapeRe(needle), "i"));
}

function escapeRe(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
