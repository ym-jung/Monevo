import type * as React from "react";

export interface SelectOption { value: string; label: string; }
export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  size?: "md" | "lg";
  placeholder?: string;
  style?: React.CSSProperties;
}
export type SelectAttributes = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof SelectProps>;
export function Select(props: SelectProps & SelectAttributes): React.JSX.Element;
