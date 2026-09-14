import { expect, test } from "./fixtures";

import { LEDGER_ID, entryIdByDescription, particularsInput, sheetTitle } from "./helpers";

test.describe.configure({ mode: "serial" });

test("renders the phone chrome instead of the sidebar", async ({ page }) => {
    await page.goto(`/ledgers/${LEDGER_ID}`);

    const banner = page.getByRole("banner");
    await expect(banner.getByRole("heading", { name: "zz-e2e", level: 1 })).toBeVisible();
    await expect(banner.getByRole("button", { name: "Menu" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Collapse sidebar" })).toHaveCount(0);

    const tabs = page.getByRole("navigation");
    for (const name of ["Ledger", "Accounts", "Insights", "Members"]) {
        await expect(tabs.getByRole("button", { name })).toBeVisible();
    }
});

test("opens the drawer from the menu button", async ({ page }) => {
    await page.goto(`/ledgers/${LEDGER_ID}`);
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.getByText("Ledgers").first()).toBeVisible();
    await expect(page.getByText("zz-golden-fixture")).toBeVisible();
});

test("switches panels from the tab bar", async ({ page }) => {
    await page.goto(`/ledgers/${LEDGER_ID}`);
    const tabs = page.getByRole("navigation");

    await tabs.getByRole("button", { name: "Accounts" }).click();
    await expect(page.getByText("e2e wallet").first()).toBeVisible();

    await tabs.getByRole("button", { name: "Ledger" }).click();
    await expect(page.getByText(/Net this month/)).toBeVisible();

    await tabs.getByRole("button", { name: "Members" }).click();
    await expect(page.getByText("dev-admin").first()).toBeVisible();
});

test("records an entry through the bottom sheet", async ({ page }) => {
    await page.goto(`/ledgers/${LEDGER_ID}`);
    const particulars = "e2e phone entry";

    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(sheetTitle(page, "New entry")).toBeVisible();

    await particularsInput(page).fill(particulars);
    await page.getByPlaceholder("0", { exact: true }).first().fill("800");
    await page.getByRole("button", { name: "Record entry" }).click();
    await expect(sheetTitle(page, "New entry")).toBeHidden();

    await expect(page.getByText(particulars).first()).toBeVisible();
    await expect(page.getByText(/Out\s*800/)).toBeVisible();

    await page.request.delete(`/api/bff/journal-entries/${await entryIdByDescription(page, particulars)}`);
});
