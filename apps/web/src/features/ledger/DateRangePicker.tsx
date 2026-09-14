"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { Icon } from "@/ds";
import { useLocale, useT } from "@/lib/i18n/provider";

import { useDismissOnOutsideClick } from "@/features/common/Sheet";

const PANEL: React.CSSProperties = {
	position: "absolute",
	top: "calc(100% + var(--space-3))",
	right: 0,
	zIndex: 45,
	width: "17rem",
	padding: "var(--space-6)",
	background: "var(--surface-paper)",
	border: "var(--hairline) solid var(--border-strong)",
	boxShadow: "var(--shadow-popover)",
};

function isoDate(year: number, month: number, day: number): string {
	return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthOf(value: string): Date {
	const [year, month] = value.split("-").map(Number);
	return new Date(year, month - 1, 1);
}

function calendarDays(cursor: Date): { key: string; day: number; current: boolean }[] {
	const year = cursor.getFullYear();
	const month = cursor.getMonth();
	const start = new Date(year, month, 1);
	const first = new Date(year, month, 1 - start.getDay());
	return Array.from({ length: 42 }, (_, index) => {
		const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index);
		return { key: isoDate(date.getFullYear(), date.getMonth(), date.getDate()), day: date.getDate(), current: date.getMonth() === month };
	});
}

export function DateRangePicker({ from, to, onChange }: {
	from: string;
	to: string;
	onChange: (from: string, to: string) => void;
}) {
	const t = useT();
	const locale = useLocale();
	const [open, setOpen] = useState(false);
	const [cursor, setCursor] = useState(() => monthOf(from));
	const [anchor, setAnchor] = useState<string | null>(null);
	const box = useRef<HTMLDivElement | null>(null);
	const close = useCallback(() => setOpen(false), []);

	useDismissOnOutsideClick(box, open, close);

	const days = useMemo(() => calendarDays(cursor), [cursor]);
	const monthLabel = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(cursor);
	const format = new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" });
	const label = `${format.format(new Date(`${from}T00:00:00`))} – ${format.format(new Date(`${to}T00:00:00`))}`;
	const weekdays = Array.from({ length: 7 }, (_, index) =>
		new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2026, 7, 2 + index)));

	function pick(value: string) {
		if (!anchor) {
			setAnchor(value);
			return;
		}
		onChange(anchor <= value ? anchor : value, anchor <= value ? value : anchor);
		setAnchor(null);
		setOpen(false);
	}

	return (
		<div ref={box} style={{ position: "relative", display: "inline-flex" }}>
			<button
				type="button"
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-label={t("insights.pickRange")}
				onClick={() => { setOpen(!open); setAnchor(null); setCursor(monthOf(from)); }}
				className="ds-focusable"
				style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-3)", height: "var(--control-height)", padding: "0 var(--space-4)", border: "var(--hairline) solid var(--border-control)", background: "var(--surface-control)", font: "var(--type-label)", letterSpacing: "var(--tracking-label)", color: "var(--text-secondary)", cursor: "pointer" }}
			>
				<Icon name="calendar" size={12} />
				{label}
			</button>

			{open ? (
				<div role="dialog" aria-label={t("insights.pickRange")} style={PANEL}>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "var(--space-5)", borderBottom: "var(--rule-row)" }}>
						<button type="button" aria-label={t("toolbar.previousMonth")} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="ds-focusable" style={{ border: 0, background: "transparent", cursor: "pointer" }}><Icon name="chevron-left" size={14} /></button>
						<span style={{ font: "var(--type-headline)", color: "var(--text-primary)" }}>{monthLabel}</span>
						<button type="button" aria-label={t("toolbar.nextMonth")} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="ds-focusable" style={{ border: 0, background: "transparent", cursor: "pointer" }}><Icon name="chevron-right" size={14} /></button>
					</div>
					<div style={{ padding: "var(--space-4) 0", font: "var(--type-label)", color: "var(--text-tertiary)" }}>{anchor ? t("insights.pickRangeEnd") : t("insights.pickRangeStart")}</div>
					<div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "var(--space-1)" }}>
						{weekdays.map((day, index) => <span key={`${day}-${index}`} style={{ textAlign: "center", font: "var(--type-label)", color: "var(--text-tertiary)" }}>{day}</span>)}
						{days.map((date) => {
							const selected = date.key === anchor || (!anchor && date.key >= from && date.key <= to);
							return (
								<button key={date.key} type="button" onClick={() => pick(date.key)} className="ds-focusable" style={{ height: "var(--control-height)", border: "var(--hairline) solid transparent", background: selected ? "var(--accent)" : "transparent", color: selected ? "var(--select-active-fg)" : date.current ? "var(--text-primary)" : "var(--text-disabled)", font: "var(--type-label-md)", cursor: "pointer" }}>{date.day}</button>
							);
						})}
					</div>
				</div>
			) : null}
		</div>
	);
}
