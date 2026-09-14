import { test as setup, expect } from "@playwright/test";

import { STORAGE_STATE } from "../playwright.config";
import { CREDENTIALS } from "./env";
import { LEDGER_ID } from "./helpers";

setup("sign in", async ({ page }) => {
    expect(CREDENTIALS.email, "CHECK_EMAIL must be set (scripts/cognito-check/.env)").not.toBe("");

    await page.goto("/sign-in");
    await page.locator('input[type="email"]').fill(CREDENTIALS.email);
    await page.locator('input[type="password"]').fill(CREDENTIALS.password);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 45_000 });
    await page.context().storageState({ path: STORAGE_STATE });

    const list = await page.request.get(`/api/bff/journal-entries?ledgerId=${LEDGER_ID}&size=100`);
    const body = await list.json();
    for (const entry of body.data?.items ?? []) {
        await page.request.delete(`/api/bff/journal-entries/${entry.id}`);
    }

    const after = await (await page.request.get(`/api/bff/journal-entries?ledgerId=${LEDGER_ID}&size=100`)).json();
    expect(after.data.items, "e2e ledger must start empty").toHaveLength(0);
});
