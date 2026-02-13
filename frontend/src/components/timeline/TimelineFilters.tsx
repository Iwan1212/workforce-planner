import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ALL_TEAMS,
  useTimelineStore,
  type ViewMode,
} from "@/stores/timelineStore";

const TEAM_LABELS: Record<string, string> = {
  PM: "PM",
  QA: "QA",
  Frontend: "Frontend",
  Backend: "Backend",
  Mobile: "Mobile",
  UX_UI_Designer: "UX/UI",
  DevOps: "DevOps",
};

export function TimelineFilters() {
  const {
    viewMode,
    setViewMode,
    selectedTeams,
    setSelectedTeams,
    scrollBack,
    scrollForward,
    goToToday,
  } = useTimelineStore();

  const toggleTeam = (team: string) => {
    if (selectedTeams.includes(team)) {
      setSelectedTeams(selectedTeams.filter((t) => t !== team));
    } else {
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const noneSelected = selectedTeams.length === 0;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      {/* View mode toggle */}
      <div className="flex rounded-md border">
        {(["monthly", "weekly"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 text-sm transition-colors ${
              viewMode === mode
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            } ${mode === "monthly" ? "rounded-l-md" : "rounded-r-md"}`}
          >
            {mode === "monthly" ? "Miesięczny" : "Tygodniowy"}
          </button>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={scrollBack}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToToday}>
          Dzisiaj
        </Button>
        <Button variant="outline" size="sm" onClick={scrollForward}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Team filter */}
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => setSelectedTeams([])}
          className={`rounded-md border px-2 py-1 text-xs transition-colors ${
            noneSelected
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
        >
          Wszystkie
        </button>
        {ALL_TEAMS.map((team) => (
          <button
            key={team}
            onClick={() => toggleTeam(team)}
            className={`rounded-md border px-2 py-1 text-xs transition-colors ${
              selectedTeams.includes(team)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {TEAM_LABELS[team] ?? team}
          </button>
        ))}
      </div>
    </div>
  );
}
