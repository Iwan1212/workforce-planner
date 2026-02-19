import { apiFetch } from "./client";

export interface Project {
  id: number;
  name: string;
  color: string;
  is_deleted: boolean;
  created_at: string;
}

export interface ProjectCreateData {
  name: string;
  color: string;
}

export interface DeleteResponse {
  deleted?: boolean;
  has_active_assignments?: boolean;
  active_assignments_count?: number;
  message?: string;
}

export function fetchProjects(search?: string): Promise<Project[]> {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<Project[]>(`/api/projects${qs}`);
}

export function createProject(data: ProjectCreateData): Promise<Project> {
  return apiFetch<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProject(
  id: number,
  data: Partial<ProjectCreateData>
): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteProject(
  id: number,
  confirm = false
): Promise<DeleteResponse> {
  const params = confirm ? "?confirm=true" : "";
  return apiFetch<DeleteResponse>(`/api/projects/${id}${params}`, {
    method: "DELETE",
  });
}
