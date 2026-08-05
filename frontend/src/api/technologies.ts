import { apiFetch } from "./client";
import type { Technology, TechnologyCreateData } from "@/types/technology";
import type { DeleteResponse } from "@/types/common";

export function fetchTechnologies(): Promise<Technology[]> {
  return apiFetch<Technology[]>("/api/technologies");
}

export function createTechnology(
  data: TechnologyCreateData,
): Promise<Technology> {
  return apiFetch<Technology>("/api/technologies", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTechnology(
  id: number,
  data: Partial<TechnologyCreateData>,
): Promise<Technology> {
  return apiFetch<Technology>(`/api/technologies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTechnology(id: number): Promise<DeleteResponse> {
  return apiFetch<DeleteResponse>(`/api/technologies/${id}`, {
    method: "DELETE",
  });
}
