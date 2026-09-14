export function ProgressBar({ value = 0, color = "var(--accent)", height = 5, style }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ width: "100%", height, borderRadius: "var(--radius-badge)", background: "var(--surface-sunken)", ...style }}>
      <div style={{ width: pct + "%", height: "100%", background: color, transition: "width var(--dur-base) var(--ease-standard)" }} />
    </div>
  );
}
