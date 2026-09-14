import type * as React from "react";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}
export function EmptyState(props: EmptyStateProps): React.JSX.Element;
