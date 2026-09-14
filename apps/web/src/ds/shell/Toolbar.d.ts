import type * as React from "react";

export interface ToolbarProps {
  title?: string;
  subtitle?: string;
  leading?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Toolbar(props: ToolbarProps): React.JSX.Element;
