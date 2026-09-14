import React from "react";

export const COLUMNS = "2.125rem minmax(8.75rem,1fr) minmax(11.25rem,1.2fr) 4rem 7.5rem 9.375rem";

export const CELL: React.CSSProperties = {
	padding: "0 var(--space-6)",
	display: "flex",
	alignItems: "center",
	gap: "var(--space-3)",
	minWidth: 0,
	overflow: "hidden",
	borderRight: "var(--hairline) solid var(--border-hairline)",
};

export const ELLIPSIS: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
