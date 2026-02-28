import { apiFetch } from "./client";

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

export function fetchUsers(): Promise<UserListItem[]> {
  return apiFetch<UserListItem[]>("/api/users");
}

export function createUser(data: UserCreateData): Promise<UserListItem> {
  return apiFetch<UserListItem>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface UserUpdateData {
  email?: string;
  full_name?: string;
  role?: string;
  password?: string;
}

export function updateUser(userId: number, data: UserUpdateData): Promise<UserListItem> {
  return apiFetch<UserListItem>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteUser(userId: number): Promise<void> {
  return apiFetch<void>(`/api/users/${userId}`, { method: "DELETE" });
}
