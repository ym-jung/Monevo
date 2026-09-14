"use client";

import { useEffect, useMemo, useState } from "react";

import { Avatar, Button, EmptyState, IconButton, Tag } from "@/ds";
import { ApiError } from "@/lib/api/errors";
import type { JournalEntryDetail, JournalLineView } from "@/lib/api/types";
import { useLocale, useT } from "@/lib/i18n/provider";
import { Amount } from "@/lib/money/currency";
import { usePhone } from "@/lib/viewport/provider";

import { type InkLookup } from "@/features/category/ink";
import { Sheet } from "@/features/common/Sheet";

import { getEntry } from "./api";
import { signOf } from "./row";

const PANE: React.CSSProperties = {
	flex: "0 0 auto",
	borderLeft: "var(--hairline) solid var(--desk-3)",
	background: "var(--surface-desk)",
	overflowY: "auto",
};

const EYEBROW: React.CSSProperties = {
	font: "var(--type-label)",
	letterSpacing: "var(--tracking-label-wide)",
	textTransform: "uppercase",
	color: "var(--text-tertiary)",
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-6)", padding: "var(--space-4) 0" }}>
			<dt style={EYEBROW}>{label}</dt>
			<dd style={{ margin: 0, minWidth: 0, font: "var(--type-callout)", color: "var(--text-primary)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis" }}>
				{children}
			</dd>
		</div>
	);
}

function moneyLine(entry: JournalEntryDetail): JournalLineView | null {
	const wanted = entry.kind === "INCOME" ? "DEBIT" : "CREDIT";
	return entry.lines.find((line) => line.side === wanted && line.account.subtype === "REAL") ?? null;
}

const TEAR: React.CSSProperties = {
	position: "absolute",
	left: 0,
	right: 0,
	height: "var(--tear-height)",
	background: "var(--tear-edge)",
};

export function Inspector({ width, entryId, inkOf, onEdit, onClose }: {
	width: number;
	entryId: string | null;
	inkOf: InkLookup;
	onEdit: (entry: JournalEntryDetail) => void;

	onClose?: () => void;
}) {
	const t = useT();
	const locale = useLocale();
	const dateTime = useMemo(() => new Intl.DateTimeFormat(locale, {
		dateStyle: "medium",
		timeStyle: "short",
		hour12: false,
	}), [locale]);
	const [entry, setEntry] = useState<JournalEntryDetail | null>(null);
	const [error, setError] = useState<unknown>(null);

	useEffect(() => {
		if (!entryId) {
			setEntry(null);
			return;
		}
		let cancelled = false;
		setError(null);
		setEntry(null);
		getEntry(entryId)
			.then((detail) => !cancelled && setEntry(detail))

			.catch((err) => !cancelled && setError(err));
		return () => {
			cancelled = true;
		};
	}, [entryId]);

	const sheet = usePhone();
	const dismiss = onClose ?? (() => {});

	function frame(children: React.ReactNode, footer?: React.ReactNode) {
		if (sheet) {
			return (
				<Sheet onDismiss={dismiss} footer={footer}>
					<div style={{ position: "relative", background: "var(--surface-paper)", padding: "var(--space-10) var(--space-6)" }}>
						<span style={{ ...TEAR, top: "calc(var(--tear-height) * -1)" }} />
						<span style={{ ...TEAR, bottom: "calc(var(--tear-height) * -1)" }} />
						{children}
					</div>
				</Sheet>
			);
		}
		return <aside style={{ ...PANE, width, padding: entry ? "var(--space-12) var(--space-10)" : undefined }}>{children}</aside>;
	}

	if (!entryId) {

		if (sheet) return null;
		return frame(<EmptyState icon="receipt-text" title={t("inspector.noSelection")} />);
	}

	if (error) {
		return frame(<EmptyState icon="circle-x" title={error instanceof ApiError ? error.message : t("inspector.loadFailed")} />);
	}

	if (!entry) {
		return frame(<EmptyState icon="clock" title={t("inspector.loading")} />);
	}

	const income = entry.kind === "INCOME";
	const sign = signOf(entry.kind);
	const money = moneyLine(entry);
	const categories = entry.lines.filter((line) => line.account.subtype === "CATEGORY");
	const converted = entry.lines.some((line) => line.currency !== entry.baseCurrency);
	const isModified = entry.createdBy.id !== entry.updatedBy.id || entry.createdAt !== entry.updatedAt;

	return frame(
		<>
			<span style={EYEBROW}>{t("inspector.entry")}</span>

			<div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
				<h2 style={{ margin: 0, font: "var(--type-title-3)", letterSpacing: "var(--tracking-normal)", textTransform: "uppercase", color: "var(--text-primary)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
					{entry.description}
				</h2>
				{sheet ? null : (
					<span style={{ flex: "0 0 auto" }}>
						<IconButton icon="pencil" size="sm" label={t("inspector.editEntry")} onClick={() => onEdit(entry)} />
					</span>
				)}
			</div>

			<div style={{ margin: "var(--space-7) 0 var(--space-2)" }}>
				<Amount
					amountMinor={(money?.amountMinor ?? entry.baseAmountMinor) * sign}
					currency={money?.currency ?? entry.baseCurrency}
					kind={income ? "income" : undefined}
					size="hero"
					showCode={false}
				/>
			</div>
			<div style={EYEBROW}>{`${money?.currency ?? entry.baseCurrency} · ${entry.kind}`}</div>

			{categories.length ? (
				<div style={{ marginTop: "var(--space-7)", display: "flex", flexWrap: "wrap", gap: "var(--space-4)" }}>
					{categories.map((line) => (
						<Tag
							key={line.id}
							color={inkOf(line.account.id)}
							label={line.account.parentName ? `${line.account.parentName} / ${line.account.name}` : line.account.name}
							inkLabel
							style={{ border: "var(--hairline) solid currentColor", padding: "var(--space-3) var(--space-5)" }}
						/>
					))}
				</div>
			) : null}

			<dl style={{ margin: "var(--space-10) 0 0" }}>
				<DetailRow label={t("slip.date")}>{entry.entryDate}</DetailRow>

				{entry.lines.map((line) => (
					<DetailRow
						key={line.id}
						label={line.side === "DEBIT" ? t("inspector.debit") : t("inspector.credit")}
					>
						<span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--space-1)" }}>
							<span style={{ display: "inline-flex", alignItems: "baseline", gap: "var(--space-4)" }}>
								<span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{line.account.name}</span>
								<Amount amountMinor={line.amountMinor} currency={line.currency} signed={false} size="sm" />
							</span>
							{line.memo ? <span style={EYEBROW}>{line.memo}</span> : null}
						</span>
					</DetailRow>
				))}

				{converted ? (
					<>
						<DetailRow label={t("inspector.baseAmount")}>
							<Amount amountMinor={entry.baseAmountMinor} currency={entry.baseCurrency} signed={false} size="sm" />
						</DetailRow>
						{money && money.currency !== entry.baseCurrency ? (
							<>
								<DetailRow label={t("inspector.fxRate")}>{money.fxRate}</DetailRow>
								<DetailRow label={t("inspector.rateDate")}>{money.fxRateAsOf ?? "—"}</DetailRow>
							</>
						) : null}
					</>
				) : null}
				<DetailRow label={t("inspector.createdBy")}>
					<span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)" }}>
						<Avatar name={entry.createdBy.displayName} size={17} />
						{entry.createdBy.displayName}
					</span>
				</DetailRow>
				<DetailRow label={t("inspector.createdAt")}>{dateTime.format(new Date(entry.createdAt))}</DetailRow>
				{isModified ? (
					<>
						<DetailRow label={t("inspector.updatedBy")}>
							<span style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)" }}>
								<Avatar name={entry.updatedBy.displayName} size={17} />
								{entry.updatedBy.displayName}
							</span>
						</DetailRow>
						<DetailRow label={t("inspector.updatedAt")}>{dateTime.format(new Date(entry.updatedAt))}</DetailRow>
					</>
				) : null}
				{entry.memo ? <DetailRow label={t("inspector.note")}>{entry.memo}</DetailRow> : null}
			</dl>
		</>,
		sheet ? (
			<div className="ds-sheet-actions">
				<Button size="lg" onClick={dismiss}>{t("common.close")}</Button>
				<Button size="lg" variant="primary" icon="pencil" onClick={() => onEdit(entry)}>{t("common.edit")}</Button>
			</div>
		) : undefined,
	);
}
