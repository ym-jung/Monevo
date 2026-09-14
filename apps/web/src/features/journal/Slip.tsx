"use client";

import type { CSSProperties, ReactNode } from "react";

import { Tag } from "@/ds";
import type { LedgerDetail } from "@/lib/api/types";
import { useLocale } from "@/lib/i18n/provider";
import { useT } from "@/lib/i18n/provider";
import { Amount } from "@/lib/money/currency";

import type { InkLookup } from "@/features/category/ink";
import { monthLabel } from "@/features/ledger/monthNav";

import { ConvertedAmount } from "./ConvertedAmount";
import { isSplit, type LedgerRow, moneyKind, signOf } from "./row";

export const GRID = "2.625rem 0.4375rem 1fr 7.25rem 2.125rem 6rem";
const GUTTER = "var(--slip-gutter)";

const BLEED = "0 calc(var(--slip-gutter) * -1)";

const ELLIPSIS: CSSProperties = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

export function SlipHeader({ ledger, month }: { ledger: LedgerDetail; month: string }) {
	const t = useT();
	const locale = useLocale();
	return (
		<div style={{ textAlign: "center", padding: "var(--space-12) 0 var(--space-7)", borderBottom: "var(--rule-section)" }}>
			<h1 style={{ margin: 0, font: "var(--type-slip-title)", letterSpacing: "var(--tracking-display)", textIndent: "var(--tracking-display)", textTransform: "uppercase", color: "var(--text-primary)" }}>
				{ledger.name}
			</h1>
			<div style={{ marginTop: "var(--space-4)", font: "var(--type-label)", letterSpacing: "var(--tracking-label-wide)", color: "var(--text-tertiary)" }}>
				{`${monthLabel(month, locale)} · ${ledger.memberCount === 1 ? t("slip.membersOne") : t("slip.members", { count: ledger.memberCount })} · ${t("slip.base", { currency: ledger.currency })}`}
			</div>
		</div>
	);
}

export function ColumnHeader() {
	const t = useT();
	return (
		<div style={{ display: "grid", gridTemplateColumns: GRID, gap: "var(--space-5)", padding: `var(--space-4) ${GUTTER} var(--space-3)`, margin: BLEED, borderBottom: "var(--rule-total)", font: "var(--type-column-header)", letterSpacing: "var(--tracking-label-wide)", color: "var(--text-tertiary)" }}>
			<span>{t("slip.date")}</span>
			<span />
			<span>{t("slip.particulars")}</span>
			<span>{t("slip.account")}</span>
			<span>{t("slip.currency")}</span>
			<span style={{ textAlign: "right" }}>{t("slip.amount")}</span>
		</div>
	);
}

export function EntryRow({
	entry, inkOf, selected, hasFx, onClick,
}: {
	entry: LedgerRow;
	inkOf: InkLookup;
	selected: boolean;
	hasFx: boolean;
	onClick: () => void;
}) {
	const t = useT();
	const dim = selected ? "var(--ink-on-dark-3)" : "var(--text-tertiary)";
	return (
		<div
			onClick={onClick}
			style={{
				display: "grid",
				gridTemplateColumns: GRID,
				gap: "var(--space-5)",
				alignItems: "center",
				padding: `var(--space-3) ${GUTTER}`,
				margin: BLEED,
				background: selected ? "var(--select-active-bg)" : "transparent",
				color: selected ? "var(--select-active-fg)" : "var(--text-primary)",
				borderRadius: "var(--radius-selection)",

				borderBottom: hasFx ? "none" : selected ? "var(--hairline) dotted var(--ink-2)" : "var(--rule-row)",
				font: "var(--type-body)",
				cursor: "default",
			}}
		>
			<span style={{ font: "var(--type-money-sm)", color: dim }}>{entry.entryDate.slice(5).replace("-", ".")}</span>
			<Tag color={inkOf(entry.categoryId)} dotOnly />
			<span style={ELLIPSIS}>
				{entry.description}
				{isSplit(entry) ? (
					<span style={{ marginLeft: "var(--space-4)", font: "var(--type-label)", letterSpacing: "var(--tracking-label)", color: selected ? "var(--ink-on-dark-3)" : "var(--text-tertiary)" }}>
						{t("slip.splitLines", { count: entry.lineCount-1 })}
					</span>
				) : null}
			</span>
			<span style={{ ...ELLIPSIS, font: "var(--type-money-sm)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: selected ? "var(--ink-on-dark-2)" : "var(--text-secondary)" }}>
				{entry.accountName ?? "—"}
			</span>
			<span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", color: dim }}>{entry.currency}</span>
			<span style={{ textAlign: "right" }}>
				<Amount
					amountMinor={entry.amountMinor * signOf(entry.kind)}
					currency={entry.currency}
					kind={moneyKind(entry.kind)}
					showCode={false}

					style={selected ? { color: entry.kind === "INCOME" ? "var(--status-success)" : "var(--select-active-fg)" } : undefined}
				/>
			</span>
		</div>
	);
}

export function FxLine({
	entry, ledger, selected, onClick,
}: {
	entry: LedgerRow;
	ledger: LedgerDetail;
	selected: boolean;
	onClick: () => void;
}) {
	return (
		<div
			onClick={onClick}
			style={{
				display: "grid",
				gridTemplateColumns: GRID,
				gap: "var(--space-5)",
				alignItems: "center",
				padding: `0 ${GUTTER} var(--space-3)`,
				margin: BLEED,
				background: selected ? "var(--select-active-bg)" : "transparent",
				borderRadius: "var(--radius-selection)",
				borderBottom: selected ? "none" : "var(--rule-row)",
				cursor: "default",
			}}
		>
			<span /><span /><span /><span /><span />
			<span style={{ textAlign: "right", font: "var(--type-label)", letterSpacing: "var(--tracking-label)", color: selected ? "var(--ink-on-dark-3)" : "var(--text-tertiary)" }}>
				<ConvertedAmount row={entry} baseCurrency={ledger.currency} />
			</span>
		</div>
	);
}

export function TotalLine({
	label, value, strong = true, account,
}: {
	label: string;
	value: ReactNode;
	strong?: boolean;
	account?: string;
}) {
	return (
		<div style={{ display: "grid", gridTemplateColumns: GRID, gap: "var(--space-5)", padding: `var(--space-4) ${GUTTER} 0`, margin: BLEED, borderTop: strong ? "var(--rule-total)" : "none", font: "var(--type-label-md)", letterSpacing: "var(--tracking-label)", color: strong ? "var(--text-secondary)" : "var(--text-tertiary)" }}>
			<span /><span />
			<span>{label}</span>
			<span style={{ ...ELLIPSIS, textTransform: "uppercase" }}>{account ?? ""}</span>
			<span />
			<span style={{ textAlign: "right" }}>{value}</span>
		</div>
	);
}

export function PrintingRule({ loaded, total, ref: sentinel }: { loaded: number; total: number; ref: (node: HTMLElement | null) => void }) {
	const t = useT();
	return (
		<div ref={sentinel} style={{ padding: "var(--space-7) 0", margin: BLEED, textAlign: "center", font: "var(--type-label)", letterSpacing: "var(--tracking-label-wide)", color: "var(--text-tertiary)", background: "var(--tear-edge)", backgroundRepeat: "repeat-x", backgroundPosition: "center" }}>
			<span style={{ background: "var(--surface-paper)", padding: "0 var(--space-6)" }}>
				{t("slip.printing", { loaded, total })}
			</span>
		</div>
	);
}
