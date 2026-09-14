import type * as React from "react";

export interface IconProps {
  name: string;
  size?: number;
  style?: React.CSSProperties;
}
export function Icon(props: IconProps): React.JSX.Element;
