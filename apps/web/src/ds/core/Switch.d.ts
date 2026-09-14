import type * as React from "react";

export interface SwitchProps {
  checked?: boolean;
  disabled?: boolean;
  label?: string;
  onChange?: (checked: boolean) => void;
  style?: React.CSSProperties;
}
export function Switch(props: SwitchProps): React.JSX.Element;
