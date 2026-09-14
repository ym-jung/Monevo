import { expect, test } from "./fixtures";

import { addEntry, deleteEntry, openEntry, openLedger } from "./helpers";

test.describe.configure({ mode: "serial" });

test("shows an entry in its own currency and converts it into the base", async ({ page }) => {
    await openLedger(page);
    const particulars = "e2e fx";

    await addEntry(page, { particulars, amount: "25.00", account: "e2e usd", category: "Groceries" });

    const main = page.getByRole("main");
    await expect(main.getByText(particulars).first()).toBeVisible();
    await expect(main.getByText("USD").first()).toBeVisible();

    const inspector = await openEntry(page, particulars);
    await expect(inspector.getByText("e2e usd").first()).toBeVisible();
    await expect(inspector.getByText(/JPY/).first()).toBeVisible();

    await deleteEntry(page, particulars);
});
