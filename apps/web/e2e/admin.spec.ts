import { expect, test } from "./fixtures";

test("shows the pending queue with per-status counts", async ({ page }) => {
    await page.goto("/admin/users");

    const nav = page.getByRole("navigation");
    await expect(nav.getByText("Pending approval")).toBeVisible({ timeout: 30_000 });
    await expect(nav.getByText("Active")).toBeVisible();
    await expect(nav.getByText("Rejected")).toBeVisible();
    await expect(nav.getByText("Suspended")).toBeVisible();

    const main = page.getByRole("main");
    await expect(main.getByText("Sign-up approvals")).toBeVisible();
    await expect(main.getByText("dev-pending").first()).toBeVisible();
});

test("switches the table when another status is picked", async ({ page }) => {
    await page.goto("/admin/users");
    const main = page.getByRole("main");
    await expect(main.getByText("dev-pending").first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole("navigation").getByText("Active", { exact: true }).click();
    await expect(main.getByText("dev-admin").first()).toBeVisible();
    await expect(main.getByText("dev-pending")).toHaveCount(0);
});

test("fills the inspector from the focused row", async ({ page }) => {
    await page.goto("/admin/users");
    const main = page.getByRole("main");
    await main.getByText("dev-pending").first().click();

    const inspector = page.getByRole("complementary");
    await expect(inspector.getByText("dev-pending").first()).toBeVisible();
    await expect(inspector.getByText("Pending approval")).toBeVisible();
    await expect(inspector.getByRole("button", { name: "Approve sign-up" })).toBeEnabled();
});

test("opens the sign-up queue from the collapsed rail", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.getByRole("main").getByText("dev-pending").first()).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await page.getByRole("navigation").getByRole("button", { name: "Sign-ups" }).click();

    const menu = page.getByRole("menu");
    await expect(menu.getByText("Pending approval")).toBeVisible();

    await menu.getByText("Active", { exact: true }).click();
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(page.getByRole("main").getByText("dev-admin").first()).toBeVisible();
});
