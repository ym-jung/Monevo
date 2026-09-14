import type * as React from "react";

export interface SegmentedOption {
  value: string;
  label: string;
  icon?: string;
}
interface SegmentedBase {
  options: SegmentedOption[];
  size?: "sm" | "md";
  style?: React.CSSProperties;
}
export interface SegmentedSingleProps extends SegmentedBase {
  value: string;
  onChange?: (value: string) => void;
}
export interface SegmentedMultiProps extends SegmentedBase {
  value: readonly string[];
  onChange?: (value: string[]) => void;
}
export type SegmentedControlProps = SegmentedSingleProps | SegmentedMultiProps;
export function SegmentedControl(props: SegmentedControlProps): React.JSX.Element;
