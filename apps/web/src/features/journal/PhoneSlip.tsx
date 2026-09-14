"use client";

import { Tag } from "@/ds";
import type { LedgerDetail, MonthlySummary } from "@/lib/api/types";
import { useT } from "@/lib/i18n/provider";
import { Amount } from "@/lib/money/currency";

import type { InkLookup } from "@/features/category/ink";

import { ConvertedAmount } from "./ConvertedAmount";
import { hasConvertedAmount, isSplit, type LedgerRow, moneyKind, signOf } from "./row";

const LABEL: React.CSSProperties = {
	font: "var(--type-label)",
	letterSpacing: "var(--tracking-label)",
	textTransform: "uppercase",
	color: "var(--text-tertiary)",
};

export function PhoneSummary({ summary, ledger, entryCount }: {
	summary: MonthlySummary | null;
	ledger: LedgerDetail;
	entryCount: number;
}) {
	const t = useT();
	const income = summary?.incomeMinor ?? 0;
	const expense = summary?.expenseMinor ?? 0;
	const net = summary?.netMinor ?? 0;

	return (
		<section style={{ padding: "var(--space-8) var(--space-6)", borderBottom: "var(--rule-total)", display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
			<div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-5)" }}>
				<span style={{ ...LABEL, letterSpacing: "var(--tracking-label-wide)" }}>{t("slip.netThisMonth")}</span>
				<Amount amountMinor={net} currency={ledger.currency} kind={net >= 0 ? "income" : undefined} size="lg" />
			</div>
			<div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3) var(--space-8)", font: "var(--type-caption)", letterSpacing: "var(--tracking-normal)", color: "var(--text-secondary)" }}>
				<span>
					{`${t("slip.in")} `}
					<Amount amountMinor={income} currency={ledger.currency} signed={false} size="sm" />
				</span>
				<span>
					{`${t("slip.out")} `}
					<Amount amountMinor={expense} currency={ledger.currency} signed={false} size="sm" />
				</span>
				<span>{`${t("slip.entries")} ${entryCount}`}</span>
			</div>
		</section>
	);
}

export function PhoneEntryRow({ entry, ledger, inkOf, selected, onClick }: {
	entry: LedgerRow;
	ledger: LedgerDetail;
	inkOf: InkLookup;
	selected: boolean;
	onClick: () => void;
}) {
	const t = useT();
	const hasFx = hasConvertedAmount(entry, ledger.currency);
	return (
		<button
			type="button"
			onClick={onClick}
			className="ds-focusable"
			style={{
				width: "100%",
				minHeight: "2.75rem",
				display: "flex",
				alignItems: "center",
				gap: "var(--space-5)",
				padding: "var(--space-5) var(--space-6)",
				border: "none",
				textAlign: "left",
				cursor: "pointer",
				background: selected ? "var(--select-active-bg)" : "transparent",
				color: selected ? "var(--select-active-fg)" : "var(--text-primary)",
				borderBottom: "var(--rule-row)",
			}}
		>
			<Tag color={inkOf(entry.categoryId)} dotOnly />

			<span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
				<span style={{ font: "var(--type-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.description}</span>
				<span style={{ ...LABEL, color: selected ? "var(--ink-on-dark-3)" : "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
					{[entry.accountName, isSplit(entry) ? t("slip.splitLines", { count: entry.lineCount }) : null, entry.entryDate.slice(5).replace("-", ".")].filter(Boolean).join(" · ")}
				</span>
			</span>

			<span style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)" }}>
				<Amount
					amountMinor={entry.amountMinor * signOf(entry.kind)}
					currency={entry.currency}
					kind={moneyKind(entry.kind)}
					showCode={false}
					style={selected ? { color: entry.kind === "INCOME" ? "var(--status-success)" : "var(--select-active-fg)" } : undefined}
				/>
				{hasFx ? (
					<span style={{ ...LABEL, color: selected ? "var(--ink-on-dark-3)" : "var(--text-tertiary)" }}>
						<ConvertedAmount row={entry} baseCurrency={ledger.currency} />
					</span>
				) : null}
			</span>
		</button>
	);
}

export function PhoneTotal({ label, account, value }: { label: string; account?: string; value: React.ReactNode }) {
	return (
		<div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-5)", padding: "var(--space-5) var(--space-6)", borderTop: "var(--rule-total)", font: "var(--type-label-md)", letterSpacing: "var(--tracking-label)", color: "var(--text-secondary)" }}>
			<span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
				{label}
				{account ? <span style={{ ...LABEL, marginLeft: "var(--space-4)" }}>{account}</span> : null}
			</span>
			<span style={{ flex: "0 0 auto" }}>{value}</span>
		</div>
	);
}
