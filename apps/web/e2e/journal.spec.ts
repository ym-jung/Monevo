import { expect, test } from "./fixtures";

import { addEntry, deleteEntry, openLedger } from "./helpers";

test.describe.configure({ mode: "serial" });

test("records an expense and shows it in the slip and the totals", async ({ page }) => {
    await openLedger(page);
    const particulars = "e2e expense";

    await addEntry(page, { particulars, amount: "1200", account: "e2e wallet", category: "Groceries" });

    const main = page.getByRole("main");
    await expect(main.getByText(particulars).first()).toBeVisible();
    await expect(main.getByText(/1 entr(y|ies)/)).toBeVisible();
    await expect(main.getByText(/Out\s*1,?200/)).toBeVisible();

    await deleteEntry(page, particulars);
    await expect(main.getByText("No transactions.")).toBeVisible();
});

test("records income separately from expense in the summary", async ({ page }) => {
    await openLedger(page);
    const particulars = "e2e income";

    await addEntry(page, { kind: "Income", particulars, amount: "50000", account: "e2e bank", category: "Wages" });

    const main = page.getByRole("main");
    await expect(main.getByText(/In\s*50,?000/)).toBeVisible();
    await expect(main.getByText(/Out\s*0/)).toBeVisible();

    await deleteEntry(page, particulars);
});

test("keeps a transfer out of income and expense totals", async ({ page }) => {
    await openLedger(page);
    const particulars = "e2e transfer";

    await addEntry(page, {
        kind: "Transfer",
        particulars,
        amount: "30000",
        account: "e2e bank",
        counterAccount: "e2e wallet",
    });

    const main = page.getByRole("main");
    await expect(main.getByText(particulars).first()).toBeVisible();

    await expect(main.getByText(/In\s*0/)).toBeVisible();
    await expect(main.getByText(/Out\s*0/)).toBeVisible();

    await deleteEntry(page, particulars);
});

test("opens an entry in the inspector with its lines", async ({ page }) => {
    await openLedger(page);
    const particulars = "e2e inspect";

    await addEntry(page, { particulars, amount: "4500", account: "e2e wallet", category: "Groceries" });

    await page.getByRole("main").getByText(particulars).first().click();
    const inspector = page.getByRole("complementary");
    await expect(inspector.getByText(particulars).first()).toBeVisible();
    await expect(inspector.getByText("e2e wallet").first()).toBeVisible();

    await deleteEntry(page, particulars);
});
