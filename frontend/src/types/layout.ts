import type { ReactNode } from "react";

export interface LayoutProps {
  children: ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

export interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export interface PageHeaderProps {
  title: string;
  action?: ReactNode;
  children?: ReactNode;
}
