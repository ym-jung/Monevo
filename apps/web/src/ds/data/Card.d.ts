import type * as React from "react";

export interface CardProps {
  title?: string;
  action?: React.ReactNode;
  padding?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Card(props: CardProps): React.JSX.Element;
