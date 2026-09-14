import { expect, test } from "./fixtures";

import { deleteEntry, openEntry, openLedger, particularsInput } from "./helpers";

test.describe.configure({ mode: "serial" });

test("splits one payment across categories and keeps the account", async ({ page }) => {
    await openLedger(page);
    const particulars = "e2e split";

    await page.getByRole("button", { name: "Add", exact: true }).click();
    await particularsInput(page).fill(particulars);

    const combos = page.getByRole("combobox");
    await combos.first().click();
    await page.getByRole("option").filter({ hasText: /^e2e bank/i }).first().click();

    await page.getByRole("button", { name: "Split" }).click();

    const amounts = page.getByPlaceholder("0", { exact: true });
    await expect(amounts).toHaveCount(2);
    await amounts.nth(0).fill("700");
    await amounts.nth(1).fill("300");

    await page.getByRole("button", { name: "Record entry" }).click();
    await expect(page.getByRole("heading", { name: "New entry" })).toBeHidden();

    const main = page.getByRole("main");
    await expect(main.getByText(particulars).first()).toBeVisible();
    await expect(main.getByText(/Out\s*1,?000/)).toBeVisible();

    const inspector = await openEntry(page, particulars);

    await expect(inspector.getByText("e2e bank").first()).toBeVisible();

    await deleteEntry(page, particulars);
});
