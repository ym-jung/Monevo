import type * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: string;
  iconAfter?: string;
  disabled?: boolean;
  active?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): React.JSX.Element;
