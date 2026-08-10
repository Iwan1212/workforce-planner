import { apiFetch } from "./client";
import type {
  CapacityInput,
  Employee,
  EmployeeCapacity,
  EmployeeCreateData,
  ImportResult,
} from "@/types/employee";
import type { DeleteResponse } from "@/types/common";

export function fetchEmployees(
  teamIds?: number[],
  technologyIds?: number[],
  search?: string,
  status: "active" | "archived" | "all" = "active",
): Promise<Employee[]> {
  const params = new URLSearchParams();
  if (teamIds && teamIds.length > 0) params.set("team_ids", teamIds.join(","));
  if (technologyIds && technologyIds.length > 0)
    params.set("technology_ids", technologyIds.join(","));
  if (search) params.set("search", search);
  params.set("status", status);
  return apiFetch<Employee[]>(`/api/employees?${params.toString()}`);
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

export function archiveEmployee(id: number): Promise<Employee> {
  return apiFetch<Employee>(`/api/employees/${id}/archive`, { method: "POST" });
}

export function unarchiveEmployee(id: number): Promise<Employee> {
  return apiFetch<Employee>(`/api/employees/${id}/unarchive`, {
    method: "POST",
  });
}

// Capacity periods are a sub-resource: every call returns the employee's full
// list afterwards, so the caller never has to merge changes by hand.

export function fetchCapacities(
  employeeId: number,
): Promise<EmployeeCapacity[]> {
  return apiFetch<EmployeeCapacity[]>(`/api/employees/${employeeId}/capacities`);
}

export function createCapacity(
  employeeId: number,
  data: CapacityInput,
): Promise<EmployeeCapacity[]> {
  return apiFetch<EmployeeCapacity[]>(
    `/api/employees/${employeeId}/capacities`,
    { method: "POST", body: JSON.stringify(data) },
  );
}

export function updateCapacity(
  employeeId: number,
  capacityId: number,
  data: CapacityInput,
): Promise<EmployeeCapacity[]> {
  return apiFetch<EmployeeCapacity[]>(
    `/api/employees/${employeeId}/capacities/${capacityId}`,
    { method: "PATCH", body: JSON.stringify(data) },
  );
}

export function deleteCapacity(
  employeeId: number,
  capacityId: number,
): Promise<EmployeeCapacity[]> {
  return apiFetch<EmployeeCapacity[]>(
    `/api/employees/${employeeId}/capacities/${capacityId}`,
    { method: "DELETE" },
  );
}

export function importEmployeesCsv(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<ImportResult>("/api/employees/import-csv", {
    method: "POST",
    body: formData,
  });
}
