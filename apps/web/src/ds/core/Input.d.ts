import type * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  suffix?: string;
  invalid?: boolean;
  disabled?: boolean;
  align?: "left" | "right" | "center";
  size?: "md" | "lg";
}
export function Input(props: InputProps): React.JSX.Element;
