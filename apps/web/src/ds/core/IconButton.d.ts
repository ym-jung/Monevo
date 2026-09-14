import type * as React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: "sm" | "md" | "lg";
  active?: boolean;
  disabled?: boolean;
  label?: string;
}
export function IconButton(props: IconButtonProps): React.JSX.Element;
