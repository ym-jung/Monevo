import type * as React from "react";

export interface ListRowProps {
  selected?: boolean;
  windowActive?: boolean;
  alt?: boolean;
  height?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function ListRow(props: ListRowProps): React.JSX.Element;
