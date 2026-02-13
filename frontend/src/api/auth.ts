import { apiFetch } from "./client";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

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

export async function requestPasswordReset(
  email: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/auth/reset-password-request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
