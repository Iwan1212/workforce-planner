import { apiFetch } from "./client";
import type { TokenResponse, UserResponse } from "@/types/auth";

export async function login(
  email: string,
  password: string,
): Promise<TokenResponse> {
  return apiFetch<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<UserResponse> {
  return apiFetch<UserResponse>("/api/auth/me");
}

export async function updateTheme(theme: "light" | "dark"): Promise<UserResponse> {
  return apiFetch<UserResponse>("/api/auth/me/theme", {
    method: "PATCH",
    body: JSON.stringify({ theme }),
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/auth/reset-password-request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
