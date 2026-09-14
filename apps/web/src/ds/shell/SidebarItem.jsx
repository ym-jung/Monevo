"use client";

import React from "react";

import { Icon } from "../core/Icon.jsx";
import { rem } from "../scale.js";

export function SidebarItem({ icon, label, dotColor, trailing, selected = false, windowActive = true, indent = 0, onClick, onEdit, onOpen, editLabel, openLabel, style }) {
  const [hover, setHover] = React.useState(false);
  const bg = selected ? (windowActive ? "var(--paper-1)" : "var(--ink-2)") : "transparent";
  const fg = selected && windowActive ? "var(--ink-1)" : "var(--ink-on-dark-2)";
  const dim = selected && windowActive ? "var(--ink-5)" : "var(--ink-on-dark-3)";
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-5)",
        height: "var(--sidebar-row-height)",
        padding: "0 var(--space-10)",
        marginLeft: rem(indent * 14),
        borderRadius: "var(--radius-selection)",
        background: bg,
        color: fg,
        font: "var(--type-label-md)",
        letterSpacing: "var(--tracking-normal)",
        textTransform: "uppercase",
        cursor: "default",
        ...style,
      }}
    >
      {dotColor ? <span style={{ width: rem(7), height: rem(7), flex: "0 0 auto", borderRadius: "var(--radius-chip)", background: dotColor }} /> : null}
      {icon ? <Icon name={icon} size={13} style={{ opacity: selected && windowActive ? 1 : 0.7 }} /> : null}
      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      {(onEdit || onOpen) && (hover || selected) ? (
        <span style={{ display: "inline-flex", gap: rem(2), flex: "0 0 auto" }}>
          {onOpen ? (
            <button
              type="button"
              aria-label={openLabel ? openLabel + " " + label : "Open " + label}
              onClick={(e) => { e.stopPropagation(); onOpen(); }}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: rem(18), height: rem(18), background: "none", border: "none", cursor: "pointer", color: dim }}
            >
              <Icon name="info" size={12} />
            </button>
          ) : null}
          {onEdit ? (
            <button
              type="button"
              aria-label={editLabel ? editLabel + " " + label : "Edit " + label}
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: rem(18), height: rem(18), background: "none", border: "none", cursor: "pointer", color: dim }}
            >
              <Icon name="pencil" size={12} />
            </button>
          ) : null}
        </span>
      ) : trailing ? (
        <span style={{ font: "var(--type-label)", letterSpacing: "var(--tracking-label)", color: dim }}>{trailing}</span>
      ) : null}
    </div>
  );
}

export function SidebarSection({ label, children, style }) {
  return (
    <div style={{ marginBottom: "var(--space-8)", ...style }}>
      <div
        style={{
          padding: "0 var(--space-10) var(--space-4)",
          font: "var(--type-label)",
          letterSpacing: "var(--tracking-label-wide)",
          textTransform: "uppercase",
          color: "var(--ink-on-dark-3)",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}
