export const CREDENTIALS = {
    email: process.env.CHECK_EMAIL ?? "",
    password: process.env.CHECK_PASSWORD ?? "",
};

export const BACKEND = process.env.E2E_BACKEND_URL ?? "http://localhost:8083";

export const E2E_LEDGER = "zz-e2e";
