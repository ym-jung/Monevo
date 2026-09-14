export function Tooltip({ label, children, style }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }} title={label}>
      {children}
    </span>
  );
}

export function TooltipBubble({ label, style }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "var(--space-1) var(--space-4)",
        background: "var(--gray-11)",
        color: "#fff",
        font: "var(--type-caption)",
        borderRadius: "var(--radius-xs)",
        boxShadow: "var(--shadow-popover)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </span>
  );
}
