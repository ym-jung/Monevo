import type * as React from "react";

export interface RadioProps {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  onChange?: (checked: boolean) => void;
  style?: React.CSSProperties;
}
export function Radio(props: RadioProps): React.JSX.Element;
