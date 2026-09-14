import { Icon } from "./Icon.jsx";

export function Input({ icon, suffix, invalid = false, disabled = false, align = "left", size = "md", style, ...rest }) {
  const height = size === "lg" ? "var(--control-height-lg)" : "var(--control-height)";
  return (
    <div
      className="ds-input"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-4)",
        height,
        padding: "0 var(--space-4)",
        boxSizing: "border-box",
        background: disabled ? "var(--surface-sunken)" : "transparent",
        border: "1px solid " + (invalid ? "var(--status-danger)" : "var(--border-control)"),
        borderRadius: "var(--radius-control)",
        color: "var(--text-tertiary)",
        width: "100%",
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={13} /> : null}
      <input
        disabled={disabled}
        {...rest}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          font: "var(--type-body)",
          letterSpacing: "var(--tracking-normal)",
          color: "var(--text-primary)",
          textAlign: align,
          fontVariantNumeric: "tabular-nums",
        }}
      />
      {suffix ? (
        <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-tertiary)" }}>{suffix}</span>
      ) : null}
    </div>
  );
}
