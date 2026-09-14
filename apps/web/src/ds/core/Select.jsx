"use client";

import { rem } from "../scale.js";

import React from "react";

import { Icon } from "./Icon.jsx";

export function Select({ options = [], value, onChange, disabled = false, size = "md", placeholder, style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [up, setUp] = React.useState(false);
  const [room, setRoom] = React.useState(232);
  const ref = React.useRef(null);
  const height = size === "lg" ? "var(--control-height-lg)" : "var(--control-height)";
  const current = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const key = (e) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(options.length - 1, i + 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const o = options[active];
        if (o) { onChange && onChange(o.value); setOpen(false); }
      }
    };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", key); };
  }, [open, active, options, onChange]);

  const openMenu = () => {
    if (disabled) return;
    const i = options.findIndex((o) => o.value === value);
    setActive(i < 0 ? 0 : i);
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      const wanted = Math.min(232, options.length * 32 + 8);
      const host = ref.current.closest("[data-viewport]");
      const top = host ? host.getBoundingClientRect().top : 0;
      const bottom = host ? host.getBoundingClientRect().bottom : window.innerHeight;
      const below = bottom - r.bottom - 8;
      const above = r.top - top - 8;
      const flip = below < wanted && above > below;
      setUp(flip);
      setRoom(Math.max(96, Math.min(wanted, flip ? above : below)));
    }
    setOpen(true);
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%", boxSizing: "border-box", ...style }}>
      <button
        {...rest}
        className="ds-select"
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-4)",
          width: "100%",
          height,
          padding: "0 var(--space-4)",
          boxSizing: "border-box",
          font: "var(--type-label-md)",
          letterSpacing: "var(--tracking-label)",
          textTransform: "uppercase",
          textAlign: "left",
          color: current ? "var(--text-primary)" : "var(--text-tertiary)",
          background: disabled ? "var(--surface-sunken)" : "transparent",
          border: "1px solid " + (open ? "var(--border-focus)" : "var(--border-control)"),
          borderRadius: "var(--radius-control)",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current ? current.label : placeholder || ""}
        </span>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={13} style={{ color: "var(--text-tertiary)", flex: "0 0 auto" }} />
      </button>
      {open ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: up ? "auto" : "calc(100% + 2px)",
            bottom: up ? "calc(100% + 2px)" : "auto",
            left: 0,
            right: 0,
            zIndex: 40,
            maxHeight: room,
            overflowY: "auto",
            background: "var(--surface-paper)",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-control)",
            boxShadow: "var(--shadow-popover)",
            padding: "var(--space-2) 0",
          }}
        >
          {options.map((o, i) => {
            const on = o.value === value;
            const hot = i === active;
            return (
              <div
                key={o.value}
                role="option"
                aria-selected={on}
                onMouseEnter={() => setActive(i)}
                onClick={() => { onChange && onChange(o.value); setOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-4)",
                  height: "var(--row-height-comfortable)",
                  padding: "0 var(--space-5)",
                  font: "var(--type-label-md)",
                  letterSpacing: "var(--tracking-label)",
                  textTransform: "uppercase",
                  background: hot ? "var(--select-active-bg)" : "transparent",
                  color: hot ? "var(--select-active-fg)" : "var(--text-primary)",
                  cursor: "pointer",
                }}
              >
                <span style={{ width: rem(9), flex: "0 0 auto", display: "inline-flex" }}>
                  {on ? <Icon name="check" size={9} /> : null}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
