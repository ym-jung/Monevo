"use client";

import React from "react";

import type { AccountDetail } from "@/lib/api/types";
import { usePhone } from "@/lib/viewport/provider";

export const ACCOUNT_ICON: Record<AccountDetail["type"], string> = {
	BANK: "landmark",
	CASH: "banknote",
	E_MONEY: "wallet",
	CREDIT_CARD: "credit-card",
};

const SHEET: React.CSSProperties = {
	width: "var(--slip-width)",
	minWidth: "var(--slip-width-min)",
	maxWidth: "100%",
	flex: "0 1 auto",
	background: "var(--surface-paper)",
	boxShadow: "var(--shadow-paper)",
	padding: "var(--space-10) var(--slip-gutter) var(--space-12)",
	minHeight: "20rem",
};

const PHONE_SHEET: React.CSSProperties = {
	width: "100%",
	minWidth: 0,
	maxWidth: "100%",
	flex: "1 1 auto",
	background: "var(--surface-paper)",
	padding: "var(--space-8) var(--space-6) var(--space-12)",
};

export function useSheetStyle(): React.CSSProperties {
	return usePhone() ? PHONE_SHEET : SHEET;
}

export const EYEBROW: React.CSSProperties = {
	font: "var(--type-label)",
	letterSpacing: "var(--tracking-label-wide)",
	textTransform: "uppercase",
	color: "var(--text-tertiary)",
};

export const ROW: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--space-6)",
	padding: "var(--space-5) 0",
	borderBottom: "var(--rule-row)",
};

export function SheetHeader({ label, action }: { label: string; action?: React.ReactNode }) {

	const phone = usePhone();
	return (
		<header
			style={{
				display: "flex",
				flexDirection: phone ? "column" : "row",
				alignItems: phone ? "stretch" : "center",
				justifyContent: "space-between",
				gap: phone ? "var(--space-5)" : "var(--space-6)",
				paddingBottom: "var(--space-5)",
				borderBottom: "var(--rule-total)",
			}}
		>
			<span style={EYEBROW}>{label}</span>
			{action}
		</header>
	);
}
