"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/ds";
import { useLocale, useT } from "@/lib/i18n/provider";

import { useDismissOnOutsideClick } from "@/features/common/Sheet";

import { monthLabel } from "./monthNav";

const PANEL: React.CSSProperties = {
	position: "absolute",
	top: "calc(100% + var(--space-3))",
	left: 0,
	zIndex: 45,
	width: "15rem",

	maxWidth: "calc(100vw - var(--space-16))",
	padding: "var(--space-6)",
	background: "var(--surface-paper)",
	border: "var(--hairline) solid var(--border-strong)",
	boxShadow: "var(--shadow-popover)",
};

const CELL: React.CSSProperties = {
	height: "var(--control-height)",
	border: "var(--hairline) solid transparent",
	borderRadius: "var(--radius-control)",
	background: "transparent",
	font: "var(--type-label-md)",
	letterSpacing: "var(--tracking-label)",
	textTransform: "uppercase",
	color: "var(--text-secondary)",
	cursor: "pointer",
};

function monthNames(locale: string): string[] {
	const format = new Intl.DateTimeFormat(locale, { month: "short" });
	return Array.from({ length: 12 }, (_, i) => format.format(new Date(2000, i, 1)));
}

export function MonthPicker({ month, onMonth, align = "left" }: {
	month: string;
	onMonth: (month: string) => void;
	align?: "left" | "right";
}) {
	const t = useT();
	const locale = useLocale();
	const [open, setOpen] = useState(false);
	const [year, setYear] = useState(() => Number(month.split("-")[0]));
	const box = useRef<HTMLDivElement | null>(null);
	const close = useCallback(() => setOpen(false), []);

	useEffect(() => {
		if (open) setYear(Number(month.split("-")[0]));
	}, [open, month]);

	useDismissOnOutsideClick(box, open, close);

	const selectedYear = Number(month.split("-")[0]);
	const selectedMonth = Number(month.split("-")[1]);
	const names = monthNames(locale);

	function pick(index: number) {
		onMonth(`${year}-${String(index + 1).padStart(2, "0")}`);
		setOpen(false);
	}

	return (
		<div ref={box} style={{ position: "relative", display: "inline-flex" }}>
			<button
				type="button"
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-label={t("toolbar.pickMonth")}
				onClick={() => setOpen(!open)}
				className="ds-focusable"
				style={{
					display: "inline-flex",
					alignItems: "center",
					gap: "var(--space-2)",
					height: "var(--control-height)",
					padding: "0 var(--space-3)",
					border: "var(--hairline) solid transparent",
					borderRadius: "var(--radius-control)",
					background: open ? "var(--surface-control-hover)" : "transparent",
					font: "var(--type-label)",
					letterSpacing: "var(--tracking-label-wide)",
					color: "var(--text-secondary)",
					whiteSpace: "nowrap",
					cursor: "pointer",
				}}
			>
				{monthLabel(month, locale)}
				<Icon name="chevron-down" size={12} />
			</button>

			{open ? (
				<div role="dialog" aria-label={t("toolbar.pickMonth")} style={{ ...PANEL, left: align === "left" ? 0 : "auto", right: align === "right" ? 0 : "auto" }}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "var(--space-5)", borderBottom: "var(--rule-row)" }}>
						<button type="button" aria-label={t("toolbar.previousYear")} onClick={() => setYear(year - 1)} className="ds-focusable" style={{ ...CELL, width: "var(--control-height)" }}>
							<Icon name="chevron-left" size={13} />
						</button>
						<span style={{ font: "var(--type-headline)", letterSpacing: "var(--tracking-normal)", color: "var(--text-primary)" }}>{year}</span>
						<button type="button" aria-label={t("toolbar.nextYear")} onClick={() => setYear(year + 1)} className="ds-focusable" style={{ ...CELL, width: "var(--control-height)" }}>
							<Icon name="chevron-right" size={13} />
						</button>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-2)", paddingTop: "var(--space-5)" }}>
						{names.map((name, i) => {
							const on = year === selectedYear && i + 1 === selectedMonth;
							return (
								<button
									key={name}
									type="button"
									onClick={() => pick(i)}
									className="ds-focusable"
									style={{
										...CELL,
										background: on ? "var(--accent)" : "transparent",
										color: on ? "var(--select-active-fg)" : "var(--text-secondary)",
										borderColor: on ? "var(--accent)" : "transparent",
									}}
								>
									{name}
								</button>
							);
						})}
					</div>
				</div>
			) : null}
		</div>
	);
}
