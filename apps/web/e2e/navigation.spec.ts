import { expect, test } from "./fixtures";

import { openLedger } from "./helpers";

test("switches between the four ledger panels", async ({ page }) => {
    await openLedger(page);
    const nav = page.getByRole("navigation");
    const main = page.getByRole("main");

    await nav.getByText("Accounts", { exact: true }).first().click();
    await expect(main.getByText("e2e wallet").first()).toBeVisible();

    await nav.getByText("Categories", { exact: true }).first().click();
    await expect(main.getByText("Food").first()).toBeVisible();

    await nav.getByText("Insights", { exact: true }).first().click();
    await expect(main.getByText(/in|out|net/i).first()).toBeVisible();

    await nav.getByText("Members", { exact: true }).first().click();
    await expect(main.getByText("dev-admin").first()).toBeVisible();

    await nav.getByText("Ledger", { exact: true }).first().click();
    await expect(main.getByRole("heading", { name: "zz-e2e", level: 1 })).toBeVisible();
});

test("moves the slip between months", async ({ page }) => {
    await openLedger(page);
    const picker = page.getByRole("button", { name: "Pick a month" });
    const start = (await picker.innerText()).trim();

    await page.getByRole("button", { name: "Next month" }).click();
    await expect(picker).not.toHaveText(start);

    await page.getByRole("button", { name: "Previous month" }).click();
    await expect(picker).toHaveText(start);
});

test("collapses and restores the sidebar", async ({ page }) => {
    await openLedger(page);
    const nav = page.getByRole("navigation");
    await expect(nav.getByText("Ledgers")).toBeVisible();

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(nav.getByText("Ledgers")).toBeHidden();

    await page.getByRole("button", { name: /expand sidebar/i }).click();
    await expect(nav.getByText("Ledgers")).toBeVisible();
});

test("keeps both ledgers reachable from the sidebar", async ({ page }) => {
    await openLedger(page);
    const nav = page.getByRole("navigation");
    await expect(nav.getByText("zz-golden-fixture")).toBeVisible();
    await nav.getByText("zz-golden-fixture").click();
    await expect(page.getByRole("heading", { name: "zz-golden-fixture", level: 1 })).toBeVisible();
});

test("opens a section from the collapsed rail and picks from it", async ({ page }) => {
    await openLedger(page);
    await page.getByRole("button", { name: "Collapse sidebar" }).click();

    const rail = page.getByRole("navigation");
    await rail.getByRole("button", { name: "Ledgers" }).click();

    const menu = page.getByRole("menu");
    await expect(menu.getByText("zz-golden-fixture")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);

    await rail.getByRole("button", { name: "Ledgers" }).click();
    await page.getByRole("menu").getByText("zz-golden-fixture").click();
    await expect(page.getByRole("heading", { name: "zz-golden-fixture", level: 1 })).toBeVisible();
    await expect(page.getByRole("menu")).toHaveCount(0);
});

test("insights asks for a different period when the mode changes", async ({ page }) => {
    await openLedger(page);
    await page.getByRole("navigation").getByText("Insights", { exact: true }).first().click();

    const analysis: string[] = [];
    await page.route("**/api/bff/**", (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.includes("/analysis")) analysis.push(url.search);
        return route.continue();
    });

    await page.getByRole("tab", { name: /year/i }).click();
    await expect.poll(() => analysis.filter((q) => q.includes("bucket=MONTH")).length).toBeGreaterThan(0);

    await page.getByRole("tab", { name: /month/i }).first().click();
    await expect.poll(() => analysis.filter((q) => q.includes("bucket=DAY")).length).toBeGreaterThan(0);
});

test("the month picker closes on Escape and on a click outside", async ({ page }) => {
    await openLedger(page);
    const picker = page.getByRole("button", { name: "Pick a month" });
    const year = page.getByRole("main").getByText(/^20\d\d$/).first();

    await picker.click();
    await expect(year).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(year).toBeHidden();

    await picker.click();
    await expect(year).toBeVisible();
    await page.getByRole("heading", { name: "zz-e2e", level: 1 }).click();
    await expect(year).toBeHidden();
});
