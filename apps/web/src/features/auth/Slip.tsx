import type { CSSProperties, ReactNode } from "react";

import { useT } from "@/lib/i18n/provider";
import { usePhone } from "@/lib/viewport/provider";

export const LABEL: CSSProperties = {
	font: "var(--type-label)",
	letterSpacing: "var(--tracking-label-wide)",
	color: "var(--text-tertiary)",
};

export const TIGHT_LABEL: CSSProperties = { ...LABEL, letterSpacing: "var(--tracking-label)" };

export const RULE: CSSProperties = { borderTop: "var(--rule-section)" };

export function Slip({ children, width = 380, footer }: { children: ReactNode; width?: number; footer?: ReactNode }) {
	const t = useT();
	const phone = usePhone();
	return (

		<div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: phone ? "var(--space-10) var(--space-6)" : "var(--space-14) var(--space-10)" }}>
			<div style={{ width: `${width / 16}rem`, maxWidth: "100%", position: "relative", background: "var(--surface-paper)", boxShadow: "var(--shadow-paper)", padding: "0 var(--slip-gutter)" }}>
				<span style={{ position: "absolute", left: 0, right: 0, top: "calc(var(--tear-height) * -1)", height: "var(--tear-height)", background: "var(--tear-edge)" }} />
				<span style={{ position: "absolute", left: 0, right: 0, bottom: "calc(var(--tear-height) * -1)", height: "var(--tear-height)", background: "var(--tear-edge)" }} />
				<div style={{ textAlign: "center", padding: "var(--space-12) 0 var(--space-8)", borderBottom: "var(--rule-section)" }}>
					<div style={{ font: "var(--type-slip-title)", letterSpacing: "var(--tracking-label-wide)", textTransform: "uppercase", color: "var(--text-primary)" }}>Monevo</div>
					<div style={{ ...LABEL, marginTop: "var(--space-3)" }}>{t("brand.tagline")}</div>
				</div>
				<div style={{ padding: "var(--space-10) 0" }}>{children}</div>
				{footer ? <div style={{ ...RULE, padding: "var(--space-6) 0 var(--space-10)", textAlign: "center" }}>{footer}</div> : null}
			</div>
		</div>
	);
}

export function Field({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
	return (
		<div style={{ marginBottom: "var(--space-7)" }}>
			<div style={{ ...LABEL, marginBottom: "var(--space-4)" }}>{label}</div>
			{children}
			{note ? <div style={{ ...TIGHT_LABEL, marginTop: "var(--space-3)" }}>{note}</div> : null}
		</div>
	);
}

export function FormError({ children }: { children?: ReactNode }) {
	if (!children) return null;
	return (
		<div role="alert" style={{ marginBottom: "var(--space-6)", font: "var(--type-prose)", color: "var(--status-danger)", textWrap: "pretty" }}>
			{children}
		</div>
	);
}
