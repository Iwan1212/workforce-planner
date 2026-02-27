import { apiFetch } from "./client";

export interface TimelineAssignment {
  id: number;
  project_id: number;
  project_name: string;
  project_color: string;
  start_date: string;
  end_date: string;
  allocation_type: string;
  allocation_value: number;
  note: string | null;
  is_tentative: boolean;
  daily_hours: number;
}

export interface MonthUtilization {
  percentage: number;
  hours: number;
  available_hours: number;
  is_overbooked: boolean;
}

export interface TimelineEmployee {
  id: number;
  name: string;
  team: string | null;
  assignments: TimelineAssignment[];
  utilization: Record<string, MonthUtilization>;
}

export interface HolidayInfo {
  date: string;
  name: string;
}

export interface TimelineData {
  employees: TimelineEmployee[];
  holidays: HolidayInfo[];
  working_days_per_month: Record<string, number>;
}

export interface AssignmentCreateData {
  employee_id: number;
  project_id: number;
  start_date: string;
  end_date: string;
  allocation_type: string;
  allocation_value: number;
  note?: string | null;
  is_tentative?: boolean;
}

export function fetchTimeline(
  startDate: string,
  endDate: string,
  teams?: string[],
  search?: string
): Promise<TimelineData> {
  const params = new URLSearchParams({ start_date: startDate, end_date: endDate });
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

export function updateAssignment(id: number, data: Partial<AssignmentCreateData>) {
  return apiFetch(`/api/assignments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAssignment(id: number) {
  return apiFetch(`/api/assignments/${id}`, { method: "DELETE" });
}
