import { apiFetch } from "./client";
import type { Project, ProjectCreateData } from "@/types/project";
import type { DeleteResponse } from "@/types/common";

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
