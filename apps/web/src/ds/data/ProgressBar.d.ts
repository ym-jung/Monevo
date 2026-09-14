import type * as React from "react";

export interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  style?: React.CSSProperties;
}
export function ProgressBar(props: ProgressBarProps): React.JSX.Element;
