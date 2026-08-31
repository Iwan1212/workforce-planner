import { apiFetch } from "./client";
import type { DashboardData } from "@/types/dashboard";

export function fetchDashboardSummary(
  startDate: string,
  endDate: string,
  teamIds?: number[],
  technologyIds?: number[],
): Promise<DashboardData> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  if (teamIds && teamIds.length > 0) params.set("team_ids", teamIds.join(","));
  if (technologyIds && technologyIds.length > 0) {
    params.set("technology_ids", technologyIds.join(","));
  }
  return apiFetch<DashboardData>(`/api/dashboard/monthly?${params}`);
}
