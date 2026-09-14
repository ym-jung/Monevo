import { expect, test } from "./fixtures";

import { LEDGER_ID, addEntry, deleteEntry, openLedger } from "./helpers";

test("does not refetch what the server already rendered", async ({ page }) => {
    const calls: string[] = [];
    await page.route("**/api/bff/**", (route) => {
        calls.push(new URL(route.request().url()).pathname + new URL(route.request().url()).search);
        return route.continue();
    });

    await page.goto(`/ledgers/${LEDGER_ID}`);
    await expect(page.getByRole("heading", { name: "zz-e2e", level: 1 })).toBeVisible();
    await page.waitForLoadState("networkidle");

    expect(calls.filter((c) => c.includes("/summary")), `summary calls: ${calls.join(", ")}`).toHaveLength(0);
    expect(calls.filter((c) => c.includes("/journal-entries?")), `entry calls: ${calls.join(", ")}`).toHaveLength(0);
});

test("does refetch once the query moves off what the server rendered", async ({ page }) => {
    await openLedger(page);

    const calls: string[] = [];
    await page.route("**/api/bff/**", (route) => {
        calls.push(new URL(route.request().url()).pathname);
        return route.continue();
    });

    await page.getByRole("button", { name: "Next month" }).click();
    await expect.poll(() => calls.filter((c) => c.includes("/summary")).length).toBeGreaterThan(0);
    await expect.poll(() => calls.filter((c) => c.includes("/journal-entries")).length).toBeGreaterThan(0);
});

test("a saved entry refreshes accounts, categories and the summary together", async ({ page }) => {
    await openLedger(page);

    const calls: string[] = [];
    await page.route("**/api/bff/**", (route) => {
        calls.push(new URL(route.request().url()).pathname);
        return route.continue();
    });

    await addEntry(page, { particulars: "e2e refresh", amount: "1500", account: "e2e wallet", category: "Groceries" });

    await expect.poll(() => calls.filter((c) => c.includes("/accounts")).length).toBeGreaterThan(0);
    await expect.poll(() => calls.filter((c) => c.includes("/categories")).length).toBeGreaterThan(0);
    await expect.poll(() => calls.filter((c) => c.includes("/summary")).length).toBeGreaterThan(0);

    await deleteEntry(page, "e2e refresh");
});
