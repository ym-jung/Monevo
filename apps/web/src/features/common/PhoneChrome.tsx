"use client";

import type { ReactNode } from "react";

import { Icon } from "@/ds";
import { useT } from "@/lib/i18n/provider";

import { useDismissOnEscape } from "./Sheet";

const SHELL: React.CSSProperties = {
	display: "flex",
	flexDirection: "column",
	height: "100dvh",
	background: "var(--surface-paper)",

	overflowX: "hidden",
	paddingTop: "var(--safe-top)",
};

export function PhoneShell({ children }: { children: ReactNode }) {
	return (
		<div data-viewport="phone" style={SHELL}>
			{children}
		</div>
	);
}

const NOOP = () => {};

const LABEL: React.CSSProperties = {
	font: "var(--type-label)",
	letterSpacing: "var(--tracking-label-wide)",
	textTransform: "uppercase",
	color: "var(--text-tertiary)",
};

export function PhoneNavBar({ leading, title, meta, trailing, onTitle }: {
	leading?: ReactNode;
	title: string;
	meta?: string;
	trailing?: ReactNode;
	onTitle?: () => void;
}) {
	const heading = (
		<>
			<h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: "var(--space-4)", font: "var(--type-slip-title)", letterSpacing: "var(--tracking-label-wide)", textTransform: "uppercase", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
				{title}
				{onTitle ? <Icon name="chevron-down" size={13} /> : null}
			</h1>
			{meta ? <div style={{ ...LABEL, marginTop: "var(--space-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{meta}</div> : null}
		</>
	);

	return (
		<header
			style={{
				flex: "0 0 auto",
				display: "flex",
				alignItems: "center",
				gap: "var(--space-5)",
				padding: "var(--space-4) var(--space-6) var(--space-5)",
				borderBottom: "var(--rule-section)",
				background: "var(--surface-paper)",
			}}
		>
			{leading}
			{onTitle ? (
				<button
					type="button"
					onClick={onTitle}
					className="ds-focusable"
					style={{ flex: 1, minWidth: 0, textAlign: "left", border: "none", background: "none", padding: 0, cursor: "pointer" }}
				>
					{heading}
				</button>
			) : (
				<div style={{ flex: 1, minWidth: 0 }}>{heading}</div>
			)}
			{trailing ? <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>{trailing}</div> : null}
		</header>
	);
}

export interface PhoneTab<T extends string> {
	id: T;
	icon: string;
	label: string;
}

export function PhoneTabBar<T extends string>({ tabs, tab, onTab }: {
	tabs: PhoneTab<T>[];
	tab: T | null;
	onTab: (id: T) => void;
}) {
	return (
		<nav
			style={{
				flex: "0 0 auto",
				display: "grid",
				gridTemplateColumns: `repeat(${tabs.length}, 1fr)`,
				height: "calc(var(--tabbar-height) + var(--safe-bottom))",
				paddingBottom: "var(--safe-bottom)",
				borderTop: "var(--rule-total)",
				background: "var(--surface-paper)",
			}}
		>
			{tabs.map((item) => {
				const selected = item.id === tab;
				return (
					<button
						key={item.id}
						type="button"
						onClick={() => onTab(item.id)}
						aria-current={selected ? "page" : undefined}
						className="ds-focusable"
						style={{
							border: "none",
							background: selected ? "var(--ink-1)" : "transparent",
							color: selected ? "var(--paper-1)" : "var(--text-tertiary)",
							cursor: "pointer",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							gap: "var(--space-1)",
							font: "var(--type-label)",
							letterSpacing: "var(--tracking-label)",
							textTransform: "uppercase",
							minWidth: 0,
						}}
					>
						<Icon name={item.icon} size={16} />
						<span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
					</button>
				);
			})}
		</nav>
	);
}

export function MenuButton({ onClick }: { onClick: () => void }) {
	const t = useT();
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={t("nav.menu")}
			className="ds-focusable"
			style={{
				flex: "0 0 auto",
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				width: "var(--control-height-lg)",
				height: "var(--control-height-lg)",
				border: "var(--hairline) solid var(--border-strong)",
				background: "transparent",
				color: "var(--text-primary)",
				cursor: "pointer",
			}}
		>
			<Icon name="menu" size={16} />
		</button>
	);
}

export function PhoneDrawer({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
	const t = useT();

	useDismissOnEscape(open ? onClose : NOOP);
	if (!open) return null;

	return (
		<div
			className="ds-scrim"
			onClick={onClose}
			style={{ position: "fixed", inset: 0, zIndex: 60, background: "var(--scrim)", display: "flex" }}
		>
			<div
				className="ds-drawer-panel"
				onClick={(event) => event.stopPropagation()}
				style={{
					width: "min(85vw, 20rem)",
					display: "flex",
					flexDirection: "column",
					background: "var(--surface-sidebar)",
					paddingTop: "var(--safe-top)",
					paddingBottom: "var(--safe-bottom)",
				}}
			>
				<div style={{ flex: "0 0 auto", display: "flex", justifyContent: "flex-end", padding: "var(--space-5) var(--space-6) 0" }}>
					<button
						type="button"
						onClick={onClose}
						aria-label={t("nav.closeMenu")}
						className="ds-focusable"
						style={{
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							width: "var(--control-height-lg)",
							height: "var(--control-height-lg)",
							border: "none",
							background: "transparent",
							color: "var(--paper-1)",
							cursor: "pointer",
						}}
					>
						<Icon name="x" size={18} />
					</button>
				</div>
				<div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>
			</div>
		</div>
	);
}
