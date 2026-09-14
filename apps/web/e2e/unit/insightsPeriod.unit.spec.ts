import { expect, test } from "@playwright/test";

import { inclusiveDays, insightPeriod } from "@/features/ledger/insightsPeriod";

test("month mode follows the slip's month, by day", () => {
    expect(insightPeriod("month", "2026-03", 2026, "", "")).toEqual({
        from: "2026-03-01", to: "2026-03-31", bucket: "DAY",
    });
});

test("a short month still ends on its own last day", () => {
    expect(insightPeriod("month", "2026-02", 2026, "", "").to).toBe("2026-02-28");
});

test("year mode spans the calendar year, by month", () => {
    expect(insightPeriod("year", "2026-03", 2025, "", "")).toEqual({
        from: "2025-01-01", to: "2025-12-31", bucket: "MONTH",
    });
});

test("a custom range keeps daily resolution up to 62 days, then switches to months", () => {

    expect(inclusiveDays("2026-03-01", "2026-05-01")).toBe(62);
    expect(insightPeriod("range", "2026-03", 2026, "2026-03-01", "2026-05-01").bucket).toBe("DAY");

    expect(inclusiveDays("2026-03-01", "2026-05-02")).toBe(63);
    expect(insightPeriod("range", "2026-03", 2026, "2026-03-01", "2026-05-02").bucket).toBe("MONTH");
});

test("a single day is one day, not zero", () => {
    expect(inclusiveDays("2026-03-05", "2026-03-05")).toBe(1);
    expect(insightPeriod("range", "2026-03", 2026, "2026-03-05", "2026-03-05")).toEqual({
        from: "2026-03-05", to: "2026-03-05", bucket: "DAY",
    });
});

test("a range spanning a DST change still counts whole days", () => {

    expect(inclusiveDays("2026-03-01", "2026-05-29")).toBe(90);
});
