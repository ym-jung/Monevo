import type * as React from "react";

export interface PopoverProps {
  width?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Popover(props: PopoverProps): React.JSX.Element;
