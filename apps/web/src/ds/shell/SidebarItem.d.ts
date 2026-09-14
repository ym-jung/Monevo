import type * as React from "react";

export interface SidebarItemProps {
  icon?: string;
  label: string;
  dotColor?: string;
  trailing?: React.ReactNode;
  selected?: boolean;
  windowActive?: boolean;
  indent?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onOpen?: () => void;
  editLabel?: string;
  openLabel?: string;
  style?: React.CSSProperties;
}
export function SidebarItem(props: SidebarItemProps): React.JSX.Element;
export interface SidebarSectionProps { label: string; children?: React.ReactNode; style?: React.CSSProperties; }
export function SidebarSection(props: SidebarSectionProps): React.JSX.Element;
