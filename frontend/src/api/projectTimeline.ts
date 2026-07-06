import { apiFetch } from "./client";
import type { ProjectTimelineData } from "@/types/project-timeline";

export function fetchProjectTimeline(
  startDate: string,
  endDate: string,
  search?: string,
): Promise<ProjectTimelineData> {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
  if (search) params.set("search", search);
  return apiFetch<ProjectTimelineData>(`/api/projects/timeline?${params}`);
}
