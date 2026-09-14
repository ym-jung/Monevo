import { Icon } from "./Icon.jsx";

const SIZES = {
  sm: { height: "var(--control-height-sm)", padding: "0 var(--space-5)", size: "var(--text-9)", tracking: "var(--tracking-label)", icon: 12 },
  md: { height: "var(--control-height)", padding: "0 var(--space-6)", size: "var(--text-10)", tracking: "var(--tracking-label)", icon: 13 },
  lg: { height: "var(--control-height-lg)", padding: "0 var(--space-8)", size: "var(--text-11)", tracking: "var(--tracking-label)", icon: 15 },
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconAfter,
  disabled = false,
  active = false,
  fullWidth = false,
  children,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "var(--space-3)",
    height: s.height,
    padding: s.padding,
    fontFamily: "var(--font-mono)",
    fontSize: s.size,
    fontWeight: "var(--weight-regular)",
    letterSpacing: s.tracking,
    textTransform: "uppercase",
    borderRadius: "var(--radius-control)",
    border: "1px solid transparent",
    cursor: disabled ? "default" : "pointer",
    whiteSpace: "nowrap",
    width: fullWidth ? "100%" : undefined,
    opacity: disabled ? 0.38 : 1,
    transition: "var(--transition-control)",
    userSelect: "none",
  };
  const variants = {
    primary: { background: "var(--accent)", color: "var(--text-on-accent)", borderColor: "var(--accent)" },
    secondary: { background: "transparent", color: "var(--text-primary)", borderColor: "var(--border-control)" },
    ghost: { background: "transparent", color: "var(--text-secondary)", borderColor: "transparent" },
    danger: { background: "transparent", color: "var(--status-danger)", borderColor: "var(--status-danger)" },
  };
  const held = active && variant !== "primary"
    ? { background: "var(--surface-control-active)", color: "var(--text-primary)", borderColor: "var(--border-control)" }
    : null;
  const cls = ["ds-button", rest.className].filter(Boolean).join(" ");
  return (
    <button type="button" disabled={disabled} aria-pressed={active || undefined} {...rest} className={cls} data-variant={variant} style={{ ...base, ...(variants[variant] || variants.secondary), ...held, ...style }}>
      {icon ? <Icon name={icon} size={s.icon} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={s.icon} /> : null}
    </button>
  );
}
