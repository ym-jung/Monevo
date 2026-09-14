export function CurrencyChip({ code, rate, asOf, source, style }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-3)",
        font: "var(--type-label-md)",
        letterSpacing: "var(--tracking-label)",
        textTransform: "uppercase",
        color: "var(--fx-badge-fg)",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {code}
      {rate ? <span>{"@ " + rate}</span> : null}
      {asOf ? <span>{"· AS OF " + asOf}</span> : null}
      {source === "MANUAL" ? <span style={{ color: "var(--status-warning)" }}>· MANUAL</span> : null}
    </span>
  );
}
