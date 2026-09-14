import { Icon } from "../core/Icon.jsx";

export function EmptyState({ icon = "inbox", title, action, style }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-6)",
        padding: "var(--space-24) var(--space-8)",
        color: "var(--text-tertiary)",
        ...style,
      }}
    >
      <Icon name={icon} size={18} />
      <div style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", textAlign: "center" }}>{title}</div>
      {action}
    </div>
  );
}
