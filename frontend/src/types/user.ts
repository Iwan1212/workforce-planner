export interface UserListItem {
  id: number;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export interface UserCreateData {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

export interface UserUpdateData {
  email?: string;
  full_name?: string;
  role?: string;
  password?: string;
}

export type UserFormMode = "add" | "edit";

export interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  mode: UserFormMode;
  user?: UserListItem | null;
  onSubmit: (data: UserCreateData | UserUpdateData) => void;
  isSubmitting: boolean;
  currentUserId?: number | null;
}
