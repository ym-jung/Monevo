import type * as React from "react";

export interface TagProps {
  color?:
    | "groceries" | "rent" | "transport" | "dining" | "utilities" | "income" | "transfer"
    | "red" | "orange" | "yellow" | "green" | "blue" | "purple" | "gray";
  label?: string;
  dotOnly?: boolean;
  inkLabel?: boolean;
  style?: React.CSSProperties;
}
export function Tag(props: TagProps): React.JSX.Element;
