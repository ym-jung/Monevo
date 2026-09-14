export function Popover({ width = 240, children, style }) {
  return (
    <div
      style={{
        width,
        padding: "var(--space-4)",
        background: "var(--surface-toolbar)",
        backdropFilter: "var(--blur-chrome)",
        WebkitBackdropFilter: "var(--blur-chrome)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-popover)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
