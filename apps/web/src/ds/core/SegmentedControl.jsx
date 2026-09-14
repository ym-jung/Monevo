import { Icon } from "./Icon.jsx";

export function SegmentedControl({ options = [], value, onChange, size = "md", style }) {
  const many = Array.isArray(value);
  const isOn = (v) => (many ? value.includes(v) : v === value);
  const pick = (v) => {
    if (!onChange) return;
    if (!many) return onChange(v);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  const height = size === "sm" ? "var(--control-height-sm)" : "var(--control-height)";
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex",
        height,
        border: "1px solid var(--border-control)",
        borderRadius: "var(--radius-control)",
        background: "transparent",
        ...style,
      }}
    >
      {options.map((o, i) => {
        const on = isOn(o.value);
        return (
          <button
            key={o.value}
            className="ds-segment"
            role="tab"
            aria-selected={on}
            onClick={() => pick(o.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-3)",
              flex: "1 1 0",
              minWidth: 0,
              padding: "0 var(--space-6)",
              border: "none",
              borderLeft: i === 0 ? "none" : "1px solid var(--border-control)",
              borderRadius: "var(--radius-control)",
              font: size === "sm" ? "var(--type-label)" : "var(--type-label-md)",
              letterSpacing: "var(--tracking-label)",
              textTransform: "uppercase",
              color: on ? "var(--select-active-fg)" : "var(--text-secondary)",
              background: on ? "var(--accent)" : "transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {o.icon ? <Icon name={o.icon} size={13} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
