"use client";


import { ELLIPSIS } from "./queueTable";

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-6)", padding: "var(--space-4) 0", borderBottom: "var(--hairline) solid var(--border-hairline)" }}>
			<span style={{ font: "var(--type-caption)", color: "var(--text-tertiary)" }}>{label}</span>
			<span style={{ ...ELLIPSIS, font: "var(--type-callout)", color: "var(--text-primary)", textAlign: "right" }}>{children}</span>
		</div>
	);
}
