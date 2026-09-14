export function Card({ title, action, padding = "var(--space-8)", children, style }) {
  return (
    <section style={{ background: "var(--surface-card)", border: "var(--rule-section)", borderRadius: "var(--radius-box)", ...style }}>
      {title ? (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            padding: "var(--space-5) var(--space-8)",
            borderBottom: "var(--rule-total)",
          }}
        >
          <h3 style={{ margin: 0, font: "var(--type-label)", letterSpacing: "var(--tracking-label-wide)", textTransform: "uppercase", color: "var(--text-secondary)" }}>{title}</h3>
          {action}
        </header>
      ) : null}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}
