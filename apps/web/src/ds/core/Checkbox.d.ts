import type * as React from "react";

export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: string;
  onChange?: (checked: boolean) => void;
  style?: React.CSSProperties;
}
export function Checkbox(props: CheckboxProps): React.JSX.Element;
