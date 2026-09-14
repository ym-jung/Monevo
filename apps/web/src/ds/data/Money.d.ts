import type * as React from "react";

export interface MoneyProps {
  amountMinor: number;
  currency: string;
  size?: "sm" | "md" | "lg" | "hero";
  kind?: "income" | "expense" | "transfer";
  signed?: boolean;
  showCode?: boolean;
  muted?: boolean;
  minorUnitExponent?: number;
  style?: React.CSSProperties;
}
export function Money(props: MoneyProps): React.JSX.Element;
export function formatMinor(amountMinor: number, currency: string, minorUnitExponent?: number): string;
