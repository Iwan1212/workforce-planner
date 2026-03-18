import { apiFetch } from "./client";
import type {
  UserListItem,
  UserCreateData,
  UserUpdateData,
} from "@/types/user";

export function fetchUsers(): Promise<UserListItem[]> {
  return apiFetch<UserListItem[]>("/api/users");
}

export function createUser(data: UserCreateData): Promise<UserListItem> {
  return apiFetch<UserListItem>("/api/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
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
