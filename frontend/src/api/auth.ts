import { apiFetch } from "./client";
import type {
  AuthConfig,
  TokenResponse,
  UserResponse,
} from "@/types/auth";

export async function getAuthConfig(): Promise<AuthConfig> {
  return apiFetch<AuthConfig>("/api/auth/config");
}

/**
 * Plain fetch rather than apiFetch: a refused sign-in is a 401 or 403 whose
 * message the login screen shows, and apiFetch would treat the 401 as an
 * expired session, try a refresh and drop the message.
 */
export async function loginWithGoogle(
  credential: string,
): Promise<TokenResponse> {
  const response = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? `HTTP ${response.status}`);
  }
  return response.json();
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
