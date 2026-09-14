import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.resolve(__dirname, "..");

for (const file of [path.join(repoRoot, "scripts/cognito-check/.env")]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
        const match = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
        if (!match || process.env[match[1]]) continue;
        process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
}

export const STORAGE_STATE = path.join(__dirname, "e2e/.auth/user.json");

export default defineConfig({
    testDir: "./e2e",
    outputDir: "./e2e/.results",
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never", outputFolder: "./e2e/.report" }]],
    timeout: 60_000,
    expect: { timeout: 15_000 },
    use: {
        baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        locale: "en-US",
        timezoneId: "Asia/Tokyo",
    },
    ...(process.env.E2E_NO_SERVER
        ? {}
        : {
            webServer: {
                command: "npm run dev",
                url: "http://localhost:3000/sign-in",
                reuseExistingServer: true,
                timeout: 180_000,
                stdout: "ignore" as const,
                stderr: "pipe" as const,
            },
        }),
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        {

            name: "unit",
            testMatch: /\.unit\.spec\.ts/,
        },
        {
            name: "desk",
            dependencies: ["setup"],
            testIgnore: [/\.phone\.spec\.ts/, /\.unit\.spec\.ts/],
            use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: STORAGE_STATE },
        },
        {

            name: "phone",
            dependencies: ["setup"],
            testMatch: /\.phone\.spec\.ts/,
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 390, height: 844 },
                deviceScaleFactor: 3,
                isMobile: true,
                hasTouch: true,
                userAgent:
                    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
                    "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
                storageState: STORAGE_STATE,
            },
        },
    ],
});
