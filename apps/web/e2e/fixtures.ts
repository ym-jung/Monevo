import { test as base, expect } from "@playwright/test";

export const test = base.extend({
    page: async ({ page }, use) => {
        await page.addInitScript(() => {
            const style = document.createElement("style");
            style.textContent = "nextjs-portal { display: none !important; }";
            const attach = () => document.head?.appendChild(style);
            if (document.head) attach();
            else document.addEventListener("DOMContentLoaded", attach);
        });
        await use(page);
    },
});

export { expect };
