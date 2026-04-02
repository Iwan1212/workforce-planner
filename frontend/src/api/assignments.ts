import { apiFetch } from "./client";
import type { TimelineData, AssignmentCreateData } from "@/types/assignment";

export function fetchTimeline(
  startDate: string,
  endDate: string,
  teams?: string[],
  search?: string,
): Promise<TimelineData> {
  const params = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  });
  if (teams && teams.length > 0) {
    params.set("teams", teams.join(","));
  }
  if (search) {
    params.set("search", search);
  }
  return apiFetch<TimelineData>(`/api/assignments/timeline?${params}`);
}

export function createAssignment(data: AssignmentCreateData) {
  return apiFetch("/api/assignments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAssignment(
  id: number,
  data: Partial<AssignmentCreateData>,
) {
  return apiFetch(`/api/assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAssignment(id: number) {
  return apiFetch(`/api/assignments/${id}`, { method: "DELETE" });
}

export function splitAssignment(id: number, splitDate: string) {
  return apiFetch(`/api/assignments/${id}/split?split_date=${splitDate}`, {
    method: "POST",
  });
}

export function duplicateAssignment(id: number) {
  return apiFetch(`/api/assignments/${id}/duplicate`, { method: "POST" });
}
