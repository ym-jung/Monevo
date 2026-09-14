import type * as React from "react";

export interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
  style?: React.CSSProperties;
}
export function Avatar(props: AvatarProps): React.JSX.Element;
