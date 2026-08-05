import { apiFetch } from "./client";
import type { Team, TeamCreateData } from "@/types/team";
import type { DeleteResponse } from "@/types/common";

export function fetchTeams(): Promise<Team[]> {
  return apiFetch<Team[]>("/api/teams");
}

export function createTeam(data: TeamCreateData): Promise<Team> {
  return apiFetch<Team>("/api/teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTeam(
  id: number,
  data: Partial<TeamCreateData>,
): Promise<Team> {
  return apiFetch<Team>(`/api/teams/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTeam(id: number): Promise<DeleteResponse> {
  return apiFetch<DeleteResponse>(`/api/teams/${id}`, { method: "DELETE" });
}
