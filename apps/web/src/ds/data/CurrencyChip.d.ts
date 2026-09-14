import type * as React from "react";

export interface CurrencyChipProps {
  code: string;
  rate?: string;
  asOf?: string;
  source?: string;
  style?: React.CSSProperties;
}
export function CurrencyChip(props: CurrencyChipProps): React.JSX.Element;
