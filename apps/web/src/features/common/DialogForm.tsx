"use client";

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

import { ApiError } from "@/lib/api/errors";
import { useT } from "@/lib/i18n/provider";
import { usePhone } from "@/lib/viewport/provider";

const FIELD_GRID = "5.75rem 1fr";

const FIELD_GRID_STACKED = "1fr";

export function DialogField({ label, children, note }: { label: string; children: ReactNode; note?: ReactNode }) {
	const phone = usePhone();
	const controlId = useId();
	const control = isValidElement(children)
		? cloneElement(children as ReactElement<{ id?: string }>, { id: controlId })
		: children;

	return (
		<div style={{ display: "grid", gridTemplateColumns: phone ? FIELD_GRID_STACKED : FIELD_GRID, alignItems: phone ? "stretch" : "center", gap: phone ? "var(--space-3)" : "var(--space-6)", marginBottom: phone ? "var(--space-7)" : "var(--space-5)" }}>
			<label htmlFor={controlId} style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label-wide)", color: "var(--text-tertiary)", textAlign: phone ? "left" : "right" }}>
				{label}
			</label>
			<div>
				{control}
				{note ? (
					<div style={{ marginTop: "var(--space-3)", font: "var(--type-label)", letterSpacing: "var(--tracking-label)", color: "var(--text-tertiary)", textWrap: "pretty" }}>
						{note}
					</div>
				) : null}
			</div>
		</div>
	);
}

export function DialogError({ error }: { error: unknown }) {
	const t = useT();
	if (!error) return null;

	let text: string;
	if (error instanceof ApiError) {

		text = error.code === "CONCURRENT_MODIFICATION" ? t("common.staleWrite") : error.message;
	} else {
		text = t("common.genericError");
	}

	return (
		<div role="alert" style={{ marginBottom: "var(--space-6)", font: "var(--type-prose)", color: "var(--status-danger)", textWrap: "pretty" }}>
			{text}
		</div>
	);
}

export function toMinor(input: string, exponent: number): number {
	const value = Math.abs(Number.parseFloat(input || "0"));
	if (!Number.isFinite(value)) return 0;
	return Math.round(value * 10 ** exponent);
}

export function fromMinor(amountMinor: number, exponent: number): string {
	const value = Math.abs(amountMinor) / 10 ** exponent;
	return exponent === 0 ? String(Math.round(value)) : value.toFixed(exponent);
}
