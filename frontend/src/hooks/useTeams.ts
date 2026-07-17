import { useQuery } from "@tanstack/react-query";
import { fetchTeams } from "@/api/teams";

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: fetchTeams,
    staleTime: 5 * 60 * 1000,
  });
}
