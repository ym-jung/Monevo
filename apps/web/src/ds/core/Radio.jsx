import { rem } from "../scale.js";

export function Radio({ checked = false, disabled = false, label, description, onChange, style }) {
  const pick = () => !disabled && onChange && onChange(true);
  return (
    <label
      className="ds-focusable"
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={pick}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); pick(); }
      }}
      style={{ display: "inline-flex", alignItems: description ? "flex-start" : "center", gap: "var(--space-4)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.38 : 1, ...style }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: rem(13),
          height: rem(13),
          marginTop: description ? 2 : 0,
          flex: "0 0 auto",
          borderRadius: "var(--radius-control)",
          background: "transparent",
          border: "1px solid " + (checked ? "var(--accent)" : "var(--border-control)"),
        }}
      >
        {checked ? <span style={{ width: rem(7), height: rem(7), background: "var(--accent)" }} /> : null}
      </span>
      <span>
        <span style={{ display: "block", font: "var(--type-label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-primary)" }}>{label}</span>
        {description ? <span style={{ display: "block", font: "var(--type-caption)", color: "var(--text-tertiary)", marginTop: rem(2) }}>{description}</span> : null}
      </span>
    </label>
  );
}
