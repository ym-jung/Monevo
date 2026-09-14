import type { CSSProperties } from "react";

export const SHELL: CSSProperties = {
	display: "flex",
	height: "100dvh",
	minWidth: "var(--shell-min-width)",
	background: "var(--surface-desk)",
	overflowX: "auto",
	overflowY: "hidden",
};

export const SEARCH_BOX: CSSProperties = {
	width: "12.25rem",
	minWidth: "6rem",
	flex: "0 1 auto",
};

export const SEARCH_BOX_NARROW: CSSProperties = {
	width: "8rem",
	minWidth: "5rem",
	flex: "0 1 auto",
};

export const TABLE_MIN_WIDTH = "42rem";
