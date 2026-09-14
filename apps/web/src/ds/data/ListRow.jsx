export function ListRow({ selected = false, windowActive = true, alt = false, height = "var(--row-height-comfortable)", onClick, children, style }) {
  const bg = selected ? (windowActive ? "var(--select-active-bg)" : "var(--select-inactive-bg)") : "transparent";
  const fg = selected && windowActive ? "var(--select-active-fg)" : "var(--text-primary)";
  return (
    <div
      className={selected ? "ds-list-row is-selected" : "ds-list-row"}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-6)",
        height,
        padding: "0 var(--space-6)",
        background: bg,
        color: fg,
        font: "var(--type-body)",
        letterSpacing: "var(--tracking-normal)",
        borderBottom: selected ? "1px dotted var(--ink-2)" : "var(--rule-row)",
        borderRadius: "var(--radius-selection)",
        cursor: "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
