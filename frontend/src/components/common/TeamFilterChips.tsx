import { ALL_TEAMS, TEAM_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { TeamFilterChipsProps } from "@/types/ui";

export function TeamFilterChips({
  selectedTeams,
  onToggleTeam,
  onSelectAll,
  className,
}: TeamFilterChipsProps) {
  const noneSelected = selectedTeams.length === 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      <button
        type="button"
        onClick={onSelectAll}
        className={cn(
          "rounded-md border px-2 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          noneSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        )}
        aria-pressed={noneSelected}
      >
        Wszystkie
      </button>
      {ALL_TEAMS.map((team) => (
        <button
          key={team}
          type="button"
          onClick={() => onToggleTeam(team)}
          className={cn(
            "rounded-md border px-2 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            selectedTeams.includes(team)
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
          aria-pressed={selectedTeams.includes(team)}
        >
          {TEAM_LABELS[team] ?? team}
        </button>
      ))}
    </div>
  );
}
