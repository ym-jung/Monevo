import { rem } from "../scale.js";

export function Switch({ checked = false, disabled = false, label, onChange, style }) {
  const toggle = () => !disabled && onChange && onChange(!checked);
  return (
    <label
      className="ds-focusable"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
      }}
      style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-5)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.38 : 1, ...style }}>
      {label ? (
        <span style={{ font: "var(--type-label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-primary)" }}>{label}</span>
      ) : null}
      <span
        onClick={toggle}
        style={{
          position: "relative",
          width: rem(30),
          height: rem(15),
          flex: "0 0 auto",
          borderRadius: "var(--radius-control)",
          border: "1px solid " + (checked ? "var(--accent)" : "var(--border-control)"),
          background: "transparent",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 1,
            left: checked ? 15 : 1,
            width: rem(12),
            height: rem(11),
            background: checked ? "var(--accent)" : "var(--ink-4)",
            transition: "left var(--dur-fast) var(--ease-standard)",
          }}
        />
      </span>
    </label>
  );
}
