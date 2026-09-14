import { rem } from "../scale.js";

export function Toolbar({ title, subtitle, leading, children, style }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-6)",
        flexWrap: "nowrap",
        height: "var(--toolbar-height)",
        padding: "0 var(--space-8)",
        background: "var(--surface-toolbar)",
        borderBottom: "var(--rule-section)",
        flex: "0 0 auto",
        ...style,
      }}
    >
      {leading}
      {title ? (
        <div style={{ flex: "0 1 auto", minWidth: "4.5rem", maxWidth: "42%", overflow: "hidden" }}>
          <div
            style={{
              font: "var(--type-slip-title)",
              letterSpacing: "var(--tracking-label-wide)",
              textTransform: "uppercase",
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                marginTop: rem(3),
                font: "var(--type-label)",
                letterSpacing: "var(--tracking-label)",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ flex: "1 1 0", minWidth: 0 }} />
      {children}
    </header>
  );
}
