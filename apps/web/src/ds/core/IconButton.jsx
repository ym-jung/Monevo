import { Icon } from "./Icon.jsx";

export function IconButton({ icon, size = "md", active = false, disabled = false, label, style, ...rest }) {
  const box = size === "sm" ? 20 : size === "lg" ? 32 : 26;
  const glyph = size === "sm" ? 13 : size === "lg" ? 18 : 15;
  const cls = ["ds-icon-button", rest.className].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      {...rest}
      className={cls}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: box,
        height: box,
        border: "1px solid " + (active ? "var(--border-control)" : "transparent"),
        borderRadius: "var(--radius-control)",
        background: "transparent",
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.32 : 1,
        transition: "var(--transition-control)",
        ...style,
      }}
    >
      <Icon name={icon} size={glyph} />
    </button>
  );
}
