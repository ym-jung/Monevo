"use client";

import { useT } from "@/lib/i18n/provider";

import { INSPECTOR_MAX, INSPECTOR_MIN, useDragWidth } from "./layout";

export function ResizeHandle({ width, onWidth }: { width: number; onWidth: (px: number) => void }) {
	const t = useT();
	const { dragging, onPointerDown } = useDragWidth(width, onWidth, INSPECTOR_MIN, INSPECTOR_MAX);
	return (
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label={t("inspector.resize")}
			onPointerDown={onPointerDown}
			style={{
				width: "var(--resize-handle-width)",
				flex: "0 0 auto",
				cursor: "col-resize",
				background: dragging ? "var(--accent)" : "transparent",
				borderLeft: "var(--hairline) solid var(--desk-3)",
			}}
		/>
	);
}
