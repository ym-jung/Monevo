import { rem } from "../scale.js";

import { Icon } from "./Icon.jsx";

export function Checkbox({ checked = false, indeterminate = false, disabled = false, label, onChange, style }) {
  const on = checked || indeterminate;
  const toggle = () => !disabled && onChange && onChange(!checked);
  return (
    <label
      className="ds-focusable"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
      }}
      style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-4)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.38 : 1, ...style }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: rem(13),
          height: rem(13),
          flex: "0 0 auto",
          borderRadius: "var(--radius-control)",
          background: on ? "var(--accent)" : "transparent",
          border: "1px solid " + (on ? "var(--accent)" : "var(--border-control)"),
          color: "var(--paper-1)",
        }}
      >
        {indeterminate ? <Icon name="minus" size={9} /> : checked ? <Icon name="check" size={9} /> : null}
      </span>
      {label ? (
        <span style={{ font: "var(--type-label-md)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text-primary)" }}>{label}</span>
      ) : null}
    </label>
  );
}
