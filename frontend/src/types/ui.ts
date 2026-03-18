import type { ComponentProps, ReactNode } from "react";
import type { Button } from "@/components/ui/button";

export interface RefreshButtonProps
  extends Omit<ComponentProps<typeof Button>, "children"> {
  label: string;
  isPending?: boolean;
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Shown on confirm button when isPending (e.g. "Usuwanie..."). Falls back to "..." if omitted. */
  pendingLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  isPending?: boolean;
  contentClassName?: string;
}

export type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export interface TeamFilterChipsProps {
  selectedTeams: string[];
  onToggleTeam: (team: string) => void;
  onSelectAll: () => void;
  className?: string;
}

export interface DataTableColumn<T> {
  id: string;
  header: string;
  align?: "left" | "right";
  cell: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string | number;
  renderActions: (row: T) => ReactNode;
  isLoading?: boolean;
  skeletonRowCount?: number;
  emptyContent?: ReactNode;
  className?: string;
}
