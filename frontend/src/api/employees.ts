import { apiFetch } from "./client";

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  team: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface EmployeeCreateData {
  first_name: string;
  last_name: string;
  team: string | null;
}

export interface DeleteResponse {
  deleted?: boolean;
  has_active_assignments?: boolean;
  active_assignments_count?: number;
  message?: string;
}

export function fetchEmployees(teams?: string[], search?: string): Promise<Employee[]> {
  const params = new URLSearchParams();
  if (teams && teams.length > 0) params.set("teams", teams.join(","));
  if (search) params.set("search", search);
  const qs = params.toString();
  return apiFetch<Employee[]>(`/api/employees${qs ? `?${qs}` : ""}`);
}

export function createEmployee(data: EmployeeCreateData): Promise<Employee> {
  return apiFetch<Employee>("/api/employees", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateEmployee(
  id: number,
  data: Partial<EmployeeCreateData>
): Promise<Employee> {
  return apiFetch<Employee>(`/api/employees/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteEmployee(
  id: number,
  confirm = false
): Promise<DeleteResponse> {
  const params = confirm ? "?confirm=true" : "";
  return apiFetch<DeleteResponse>(`/api/employees/${id}${params}`, {
    method: "DELETE",
  });
}
