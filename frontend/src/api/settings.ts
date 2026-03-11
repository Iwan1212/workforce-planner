import { apiFetch } from "./client";

export interface CalamariConfig {
  subdomain: string | null;
  is_configured: boolean;
  last_synced_at: string | null;
}

export function fetchCalamariConfig(): Promise<CalamariConfig> {
  return apiFetch<CalamariConfig>("/api/settings/calamari");
}

export function updateCalamariConfig(data: {
  api_key: string;
  subdomain: string;
}): Promise<{ status: string; message: string }> {
  return apiFetch("/api/settings/calamari", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteCalamariConfig(): Promise<{ status: string; message: string }> {
  return apiFetch("/api/settings/calamari", { method: "DELETE" });
}

export function triggerVacationSync(): Promise<{ status: string; synced: number }> {
  return apiFetch("/api/calendar/vacations/sync", { method: "POST" });
}
