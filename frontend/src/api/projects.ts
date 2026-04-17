import { apiFetch } from "./client";
import type { Project, ProjectCreateData } from "@/types/project";
import type { DeleteResponse } from "@/types/common";

export function fetchProjects(
  search?: string,
  status: "active" | "archived" | "all" = "active",
): Promise<Project[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("status", status);
  return apiFetch<Project[]>(`/api/projects?${params.toString()}`);
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
  confirm = false,
): Promise<DeleteResponse> {
  const params = confirm ? "?confirm=true" : "";
  return apiFetch<DeleteResponse>(`/api/projects/${id}${params}`, {
    method: "DELETE",
  });
}

export function archiveProject(id: number): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}/archive`, { method: "POST" });
}

export function unarchiveProject(id: number): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}/unarchive`, { method: "POST" });
}
