"use client";

import React from "react";

import { Icon } from "@/ds";

import { useDismissOnEscape } from "./Sheet";

export const RAIL_BUTTON: React.CSSProperties = {
	width: "var(--control-height)",
	height: "var(--control-height)",
	display: "grid",
	placeItems: "center",
	flex: "0 0 auto",
	background: "transparent",
	border: "none",
	borderRadius: "var(--radius-control)",
	color: "var(--ink-on-dark-3)",
	cursor: "pointer",
	textDecoration: "none",
};

export const RAIL_DIVIDER: React.CSSProperties = {
	width: "1.25rem",
	height: "var(--hairline)",
	background: "var(--ink-3)",
	margin: "var(--space-3) 0",
	flex: "0 0 auto",
};

export function RailButton({ icon, label, selected = false, onClick }: {
	icon: string;
	label: string;
	selected?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={onClick}
			className="ds-focusable"
			style={{
				...RAIL_BUTTON,
				background: selected ? "var(--paper-1)" : "transparent",
				color: selected ? "var(--ink-1)" : "var(--ink-on-dark-3)",
			}}
		>
			<Icon name={icon} size={15} />
		</button>
	);
}

export function RailNav({ children }: { children: React.ReactNode }) {
	return (
		<nav
			style={{
				position: "relative",
				width: "var(--sidebar-rail-width)",
				flex: "0 0 auto",
				background: "var(--surface-sidebar)",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				padding: "var(--space-6) 0",
				gap: "var(--space-3)",
			}}
		>
			{children}
		</nav>
	);
}

export function RailFlyout({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
	useDismissOnEscape(onClose);

	return (
		<>
			<span onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
			<div
				role="menu"
				style={{
					position: "absolute",
					left: "calc(var(--sidebar-rail-width) + var(--space-2))",
					top: "var(--space-6)",
					zIndex: 41,
					width: "var(--sidebar-width)",
					maxHeight: "calc(100dvh - var(--space-16))",
					overflowY: "auto",
					padding: "var(--space-6) 0",
					background: "var(--surface-sidebar)",
					border: "var(--hairline) solid var(--ink-3)",
					boxShadow: "var(--shadow-popover)",
				}}
			>
				{children}
			</div>
		</>
	);
}
