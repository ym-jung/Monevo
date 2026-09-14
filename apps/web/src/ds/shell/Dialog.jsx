import { rem } from "../scale.js";

export function Dialog({ title, message, width = 460, footer, children, style }) {
  const sheet = { width: "100%", maxWidth: rem(width) };
  const tear = { position: "absolute", left: 0, right: 0, height: "var(--tear-height)", background: "var(--tear-edge)" };
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", background: "var(--scrim)", padding: "9% var(--space-8) var(--space-8)", overflowY: "auto", ...style }}>
      <div style={{ position: "relative", ...sheet, background: "var(--surface-sheet)", borderRadius: "var(--radius-box)", boxShadow: "var(--shadow-paper)" }}>
        <span style={{ ...tear, top: "calc(var(--tear-height) * -1)" }} />
        <span style={{ ...tear, bottom: "calc(var(--tear-height) * -1)" }} />
        <div style={{ padding: "var(--space-10) var(--space-16) var(--space-8)" }}>
          {title ? (
            <h2 style={{ margin: 0, font: "var(--type-slip-title)", letterSpacing: "var(--tracking-label-wide)", textTransform: "uppercase", textAlign: "center", color: "var(--text-primary)" }}>{title}</h2>
          ) : null}
          {message ? (
            <p style={{ margin: "var(--space-6) 0 0", font: "var(--type-prose)", color: "var(--text-secondary)", textWrap: "pretty" }}>{message}</p>
          ) : null}
          {children ? <div style={{ marginTop: "var(--space-8)" }}>{children}</div> : null}
        </div>
        {footer ? (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-4)", padding: "var(--space-6) var(--space-16) var(--space-10)", borderTop: "var(--rule-section)" }}>{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
