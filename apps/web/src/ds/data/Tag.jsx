import { rem } from "../scale.js";

const COLORS = {
  groceries: "var(--cat-groceries)",
  rent: "var(--cat-rent)",
  transport: "var(--cat-transport)",
  dining: "var(--cat-dining)",
  utilities: "var(--cat-utilities)",
  income: "var(--cat-income)",
  transfer: "var(--cat-transfer)",
  green: "var(--cat-groceries)",
  purple: "var(--cat-rent)",
  blue: "var(--cat-transport)",
  orange: "var(--cat-dining)",
  gray: "var(--cat-transfer)",
  red: "var(--debit)",
  yellow: "var(--tag-yellow)",
};

export function Tag({ color = "gray", label, dotOnly = false, inkLabel = false, style }) {
  const ink = COLORS[color] || COLORS.gray;
  const chip = <span style={{ width: rem(7), height: rem(7), flex: "0 0 auto", borderRadius: "var(--radius-chip)", background: ink }} />;
  if (dotOnly) return chip;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-4)",
        font: "var(--type-label-md)",
        letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase",
        color: inkLabel ? ink : "inherit",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {chip}
      {label}
    </span>
  );
}
