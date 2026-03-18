import { apiFetch } from "./client";
import type { Employee, EmployeeCreateData, ImportResult } from "@/types/employee";
import type { DeleteResponse } from "@/types/common";

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

export function importEmployeesCsv(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ImportResult>("/api/employees/import-csv", {
    method: "POST",
    body: formData,
  });
}
