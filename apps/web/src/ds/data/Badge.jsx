import { rem } from "../scale.js";

const TONES = {
  neutral: "var(--text-secondary)",
  info: "var(--status-info)",
  success: "var(--status-success)",
  warning: "var(--status-warning)",
  danger: "var(--status-danger)",
  pending: "var(--status-pending)",
};

export function Badge({ tone = "neutral", children, style }) {
  const ink = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: rem(18),
        padding: "0 var(--space-4)",
        border: "1px solid " + ink,
        borderRadius: "var(--radius-badge)",
        background: "transparent",
        color: ink,
        font: "var(--type-label)",
        letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
