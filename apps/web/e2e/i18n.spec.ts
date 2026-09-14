import { expect, test } from "./fixtures";

import { LEDGER_ID } from "./helpers";

const LOCALES = [
    { code: "ko", marker: /가계부|계정|분개|원장/ },
    { code: "ja", marker: /家計簿|口座|仕訳|元帳/ },
] as const;

test.describe.configure({ mode: "serial" });

test.afterEach(async ({ page }) => {
    await page.request.patch("/api/bff/users/me", { data: { locale: "en" } });
});

for (const locale of LOCALES) {
    test(`renders the ledger window in ${locale.code}`, async ({ page }) => {
        const response = await page.request.patch("/api/bff/users/me", { data: { locale: locale.code } });
        expect(response.ok(), await response.text()).toBeTruthy();

        await page.goto(`/ledgers/${LEDGER_ID}`);
        await expect(page.getByRole("heading", { name: "zz-e2e", level: 1 })).toBeVisible();
        await expect(page.getByRole("navigation").getByText(locale.marker).first()).toBeVisible();

        await expect(page.getByRole("main").getByText(/^[a-z]+\.[a-zA-Z.]+$/)).toHaveCount(0);
    });
}

test("comes back to english", async ({ page }) => {
    await page.goto(`/ledgers/${LEDGER_ID}`);
    await expect(page.getByRole("navigation").getByText("Ledgers")).toBeVisible();
});
