import type * as React from "react";

export interface DialogProps {
  title?: string;
  message?: string;
  width?: number;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Dialog(props: DialogProps): React.JSX.Element;
