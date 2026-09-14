"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

const SCRIM: React.CSSProperties = {
	position: "fixed",
	inset: 0,
	zIndex: 50,
	display: "flex",
	alignItems: "flex-end",
	background: "var(--scrim)",
};

const PANEL: React.CSSProperties = {
	width: "100%",
	maxHeight: "88dvh",
	display: "flex",
	flexDirection: "column",
	background: "var(--surface-sheet)",
	borderTop: "var(--rule-total)",
	boxShadow: "var(--shadow-sheet)",
};

export function useDismissOnEscape(onDismiss: () => void) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onDismiss();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onDismiss]);
}

export function useDismissOnOutsideClick(
	box: React.RefObject<HTMLElement | null>,
	open: boolean,
	onDismiss: () => void,
) {
	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onDismiss();
		};
		const onDown = (event: PointerEvent) => {
			if (box.current && !box.current.contains(event.target as Node)) onDismiss();
		};
		window.addEventListener("keydown", onKey);
		window.addEventListener("pointerdown", onDown);
		return () => {
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("pointerdown", onDown);
		};
	}, [box, open, onDismiss]);
}

export function Sheet({ title, footer, onDismiss, children }: {
	title?: ReactNode;

	footer?: ReactNode;
	onDismiss: () => void;
	children: ReactNode;
}) {
	useDismissOnEscape(onDismiss);
	return (
		<div className="ds-scrim" style={SCRIM} onClick={onDismiss}>
			<div className="ds-sheet-panel" style={PANEL} onClick={(event) => event.stopPropagation()}>
				{title ? (
					<h2 style={{ margin: 0, flex: "0 0 auto", padding: "var(--space-10) var(--space-10) var(--space-6)", font: "var(--type-slip-title)", letterSpacing: "var(--tracking-label-wide)", textTransform: "uppercase", textAlign: "center", color: "var(--text-primary)" }}>
						{title}
					</h2>
				) : null}

				<div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto", padding: "0 var(--space-10) var(--space-10)" }}>
					{children}
				</div>

				{footer ? (
					<div
						style={{
							flex: "0 0 auto",
							display: "flex",
							gap: "var(--space-4)",
							padding: "var(--space-6) var(--space-10)",
							paddingBottom: "calc(var(--space-6) + var(--safe-bottom))",
							borderTop: "var(--rule-section)",
						}}
					>
						{footer}
					</div>
				) : null}
			</div>
		</div>
	);
}
