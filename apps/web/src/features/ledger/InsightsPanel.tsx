"use client";

import { useEffect, useMemo, useState } from "react";

import { Button, EmptyState, ProgressBar, SegmentedControl } from "@/ds";
import { ApiError } from "@/lib/api/errors";
import type { CategorySummaryNode, LedgerDetail, MonthlySummary, PeriodSummary } from "@/lib/api/types";
import { useLocale, useT } from "@/lib/i18n/provider";
import { Amount } from "@/lib/money/currency";

import { type InkLookup, inkVar } from "@/features/category/ink";
import { getPeriodSummary } from "@/features/report/api";

import { DateRangePicker } from "./DateRangePicker";
import { MonthPicker } from "./MonthPicker";
import { monthRange } from "./monthNav";

import { EYEBROW, SheetHeader, useSheetStyle } from "./panelChrome";
import { insightPeriod, type InsightMode } from "./insightsPeriod";

function InsightCategory({ item, ledger, inkOf, scale, indent = false }: {
	item: CategorySummaryNode;
	ledger: LedgerDetail;
	inkOf: InkLookup;
	scale: number;
	indent?: boolean;
}) {
	const ink = inkVar(inkOf(item.categoryId));
	return (
		<article style={{ padding: "var(--space-6) 0", paddingLeft: indent ? "var(--space-12)" : 0, borderBottom: "var(--rule-row)" }}>
			<div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
				<span style={{ width: 7, height: 7, flex: "0 0 auto", background: ink }} />
				<b style={{ flex: 1, minWidth: 0, font: indent ? "var(--type-body)" : "var(--type-label-md)", fontWeight: "var(--weight-medium)", letterSpacing: indent ? "var(--tracking-normal)" : "var(--tracking-label)", textTransform: indent ? "none" : "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</b>
				<Amount amountMinor={item.expenseMinor} currency={ledger.currency} signed={false} />
			</div>
			<div style={{ marginTop: "var(--space-4)" }}>
				<ProgressBar value={Math.max(2, (item.expenseMinor / Math.max(scale, 1)) * 100)} color={ink} />
			</div>
		</article>
	);
}

export function InsightsPanel({ summary, ledger, month, onMonth, accountIds, categoryIds, inkOf }: {
	summary: MonthlySummary | null;
	ledger: LedgerDetail;
	month: string;
	onMonth: (month: string) => void;
	accountIds: string[];
	categoryIds: string[];
	inkOf: InkLookup;
}) {
	const sheet = useSheetStyle();
	const t = useT();
	const locale = useLocale();
	const [mode, setMode] = useState<InsightMode>("month");
	const [year, setYear] = useState(() => Number(month.slice(0, 4)));
	const initialRange = monthRange(month);
	const [rangeFrom, setRangeFrom] = useState(initialRange.from);
	const [rangeTo, setRangeTo] = useState(initialRange.to);
	const [analysis, setAnalysis] = useState<PeriodSummary | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<ApiError | null>(null);

	const period = useMemo(
		() => insightPeriod(mode, month, year, rangeFrom, rangeTo),
		[mode, month, year, rangeFrom, rangeTo],
	);

	useEffect(() => {
		let cancelled = false;
		setAnalysis(null);
		setLoading(true);
		setError(null);
		getPeriodSummary(ledger.id, period.from, period.to, period.bucket,
			accountIds.length ? accountIds : undefined, categoryIds.length ? categoryIds : undefined)
			.then((value) => { if (!cancelled) setAnalysis(value); })
			.catch((reason) => {
				if (!cancelled) setError(reason instanceof ApiError ? reason : new ApiError(0, "INTERNAL_ERROR", t("common.genericError")));
			})
			.finally(() => { if (!cancelled) setLoading(false); });
		return () => { cancelled = true; };
	}, [ledger.id, period, accountIds, categoryIds, t]);

	const display = analysis ?? (mode === "month" ? summary : null);
	const rows = display?.byCategory ?? [];
	const max = rows.reduce((m, r) => Math.max(m, r.expenseMinor), 0) || 1;
	const hasActivity = !!display && (display.incomeMinor !== 0 || display.expenseMinor !== 0);
	const pointFormat = new Intl.DateTimeFormat(locale, period.bucket === "DAY"
		? { month: "short", day: "numeric" }
		: { year: "numeric", month: "short" });

	return (
		<section style={sheet}>
			<SheetHeader label={t("insights.analysis")} />
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-5)", flexWrap: "wrap", padding: "var(--space-6) 0", borderBottom: "var(--rule-section)" }}>
				<SegmentedControl
					value={mode}
					onChange={(value: string) => setMode(value as InsightMode)}
					options={[
						{ value: "month", label: t("insights.modeMonth") },
						{ value: "year", label: t("insights.modeYear") },
						{ value: "range", label: t("insights.modeRange") },
					]}
				/>
				{mode === "month" ? <MonthPicker month={month} onMonth={onMonth} align="right" /> : null}
				{mode === "year" ? (
					<div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
						<Button size="sm" variant="ghost" icon="chevron-left" onClick={() => setYear((value) => value - 1)} />
						<span style={{ minWidth: "4rem", textAlign: "center", font: "var(--type-headline)" }}>{year}</span>
						<Button size="sm" variant="ghost" icon="chevron-right" onClick={() => setYear((value) => value + 1)} />
					</div>
				) : null}
				{mode === "range" ? <DateRangePicker from={rangeFrom} to={rangeTo} onChange={(from, to) => { setRangeFrom(from); setRangeTo(to); }} /> : null}
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", borderBottom: "var(--rule-total)" }}>
				{[
					{ label: t("insights.income"), value: display?.incomeMinor ?? 0, kind: "income" as const },
					{ label: t("insights.expense"), value: display?.expenseMinor ?? 0, kind: undefined },
					{ label: t("insights.netChange"), value: display?.netMinor ?? 0, kind: (display?.netMinor ?? 0) >= 0 ? "income" as const : undefined },
				].map((stat) => (
					<div key={stat.label} style={{ padding: "var(--space-7) var(--space-5)", borderRight: "var(--rule-row)" }}>
						<div style={EYEBROW}>{stat.label}</div>
						<div style={{ marginTop: "var(--space-3)" }}><Amount amountMinor={stat.value} currency={ledger.currency} kind={stat.kind} /></div>
					</div>
				))}
			</div>

			{loading ? <div role="status" style={{ padding: "var(--space-6) 0", font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{t("insights.loading")}</div> : null}
			{error ? <div role="alert" style={{ padding: "var(--space-6) 0", font: "var(--type-prose)", color: "var(--status-danger)" }}>{error.message}</div> : null}

			{analysis?.series.length ? (
				<div style={{ paddingTop: "var(--space-8)" }}>
					<div style={{ ...EYEBROW, paddingBottom: "var(--space-4)" }}>{t("insights.trend")}</div>
					<div style={{ display: "grid", gridTemplateColumns: "minmax(5rem, 1fr) repeat(3, minmax(4.5rem, 1fr))", gap: "var(--space-4)", padding: "var(--space-3) 0", borderBottom: "var(--rule-total)", ...EYEBROW }}>
						<span>{t("insights.period")}</span>
						<span>{t("insights.income")}</span>
						<span>{t("insights.expense")}</span>
						<span>{t("insights.netChange")}</span>
					</div>
					{analysis.series.map((point) => (
						<div key={point.periodStart} style={{ display: "grid", gridTemplateColumns: "minmax(5rem, 1fr) repeat(3, minmax(4.5rem, 1fr))", gap: "var(--space-4)", alignItems: "center", padding: "var(--space-4) 0", borderBottom: "var(--rule-row)", font: "var(--type-caption)" }}>
							<span style={{ color: "var(--text-secondary)" }}>{pointFormat.format(new Date(`${point.periodStart}T00:00:00`))}</span>
							<Amount amountMinor={point.incomeMinor} currency={ledger.currency} signed={false} showCode={false} size="sm" />
							<Amount amountMinor={point.expenseMinor} currency={ledger.currency} signed={false} showCode={false} size="sm" />
							<Amount amountMinor={point.netMinor} currency={ledger.currency} showCode={false} size="sm" />
						</div>
					))}
				</div>
			) : null}

			{!loading && !error && !hasActivity ? <EmptyState icon="chart-no-axes-column" title={t("insights.noActivityPeriod")} /> : null}

			{rows.length ? (
				<div style={{ paddingTop: "var(--space-8)" }}>
					<div style={{ ...EYEBROW, paddingBottom: "var(--space-4)" }}>{t("insights.categories")}</div>
					{rows.map((item) => (
						<div key={item.categoryId}>
							<InsightCategory item={item} ledger={ledger} inkOf={inkOf} scale={max} />
							{item.children.map((child) => <InsightCategory key={child.categoryId} item={child} ledger={ledger} inkOf={inkOf} scale={item.expenseMinor} indent />)}
						</div>
					))}
				</div>
			) : null}
		</section>
	);
}
