import type * as React from "react";

export interface BadgeProps {
  tone?: "neutral" | "info" | "success" | "warning" | "danger" | "pending";
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Badge(props: BadgeProps): React.JSX.Element;
