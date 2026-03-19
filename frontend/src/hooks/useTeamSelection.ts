import { useState, useCallback } from "react";

export function useTeamSelection(initial: string[] = []) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>(initial);

  const toggleTeam = useCallback((team: string) => {
    setSelectedTeams((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    );
  }, []);

  const selectAllTeams = useCallback(() => setSelectedTeams([]), []);

  return { selectedTeams, setSelectedTeams, toggleTeam, selectAllTeams };
}
