"use client";

import type { CategorySummaryNode, LedgerDetail, MonthlySummary } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { Amount } from "@/lib/money/currency";
import { usePhone } from "@/lib/viewport/provider";

import { type InkLookup, inkVar } from "@/features/category/ink";

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<span>
			{`${label} `}
			<b style={{ fontWeight: "var(--weight-medium)", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "var(--tracking-normal)" }}>
				{children}
			</b>
		</span>
	);
}

export function SlipSummary({ summary, ledger }: { summary: MonthlySummary | null; ledger: LedgerDetail }) {
	const t = useT();
	const phone = usePhone();
	const income = summary?.incomeMinor ?? 0;
	const expense = summary?.expenseMinor ?? 0;
	const net = summary?.netMinor ?? 0;

	return (
		<>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "var(--space-7) 0 var(--space-6)" }}>
				<span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label-wide)", color: "var(--text-tertiary)" }}>{t("slip.netThisMonth")}</span>
				<Amount amountMinor={net} currency={ledger.currency} kind={net >= 0 ? "income" : undefined} size="lg" />
			</div>
			<div style={{ display: "flex", flexWrap: phone ? "wrap" : "nowrap", gap: phone ? "var(--space-4) var(--space-8)" : "var(--space-12)", padding: "0 0 var(--space-6)", borderBottom: "var(--rule-section)", font: "var(--type-caption)", letterSpacing: "var(--tracking-normal)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
				<Stat label={t("slip.in")}><Amount amountMinor={income} currency={ledger.currency} signed={false} size="sm" /></Stat>
				<Stat label={t("slip.out")}><Amount amountMinor={expense} currency={ledger.currency} signed={false} size="sm" /></Stat>
			</div>
		</>
	);
}

export function Breakdown({ summary, ledger, inkOf }: { summary: MonthlySummary | null; ledger: LedgerDetail; inkOf: InkLookup }) {
	const phone = usePhone();
	const items = (summary?.byCategory ?? [])
		.map((node: CategorySummaryNode) => ({
			id: node.categoryId,
			name: node.name,

			total: node.expenseMinor,
		}))
		.filter((item) => item.total > 0)
		.sort((a, b) => b.total - a.total);

	if (!items.length) return null;

	const half = phone ? items.length : Math.ceil(items.length / 2);
	const column = (list: typeof items) => (
		<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
			{list.map((item) => (
				<div key={item.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-secondary)" }}>
					<span style={{ width: 7, height: 7, flex: "0 0 auto", borderRadius: "var(--radius-chip)", background: inkVar(inkOf(item.id)) }} />
					{item.name}
					<b style={{ marginLeft: "auto", fontWeight: "var(--weight-regular)", color: "var(--text-primary)" }}>
						<Amount amountMinor={item.total} currency={ledger.currency} signed={false} showCode={false} size="sm" />
					</b>
				</div>
			))}
		</div>
	);

	return (
		<div style={{ display: "flex", padding: "var(--space-7) 0 var(--space-1)", marginTop: "var(--space-6)", borderTop: "var(--rule-section)" }}>
			{column(items.slice(0, half))}
			{phone ? null : <div style={{ width: "var(--space-16)" }} />}
			{phone ? null : column(items.slice(half))}
		</div>
	);
}
