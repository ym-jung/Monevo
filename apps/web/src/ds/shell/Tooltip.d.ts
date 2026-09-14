import type * as React from "react";

export interface TooltipProps { label: string; children?: React.ReactNode; style?: React.CSSProperties; }
export function Tooltip(props: TooltipProps): React.JSX.Element;
export interface TooltipBubbleProps { label: string; style?: React.CSSProperties; }
export function TooltipBubble(props: TooltipBubbleProps): React.JSX.Element;
