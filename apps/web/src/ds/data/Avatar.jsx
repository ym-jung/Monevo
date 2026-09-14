import { rem } from "../scale.js";

export function Avatar({ name = "", size = 22, color = "var(--ink-1)", style }) {
  const initial = name.trim().slice(0, 1).toUpperCase();
  return (
    <span
      title={name}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: rem(size),
        height: rem(size),
        flex: "0 0 auto",
        borderRadius: "var(--radius-chip)",
        background: color,
        color: "var(--paper-1)",
        fontFamily: "var(--font-mono)",
        fontWeight: "var(--weight-regular)",
        fontSize: rem(size * 0.44),
        letterSpacing: "0.04em",
        ...style,
      }}
    >
      {initial}
    </span>
  );
}
