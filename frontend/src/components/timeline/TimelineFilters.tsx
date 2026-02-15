import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    searchQuery,
    setSearchQuery,
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
    <div className="mb-4 space-y-2">
      {/* Row 1: View mode + Navigation */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-md border">
          {(["monthly", "weekly"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              } ${mode === "monthly" ? "rounded-l-md" : "rounded-r-md"}`}
              aria-pressed={viewMode === mode}
            >
              {mode === "monthly" ? "Miesięczny" : "Tygodniowy"}
            </button>
          ))}
        </div>

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
      </div>

      {/* Row 2: Search + Team filter */}
      <div className="flex items-center gap-3">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj pracownika..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Wyczyść wyszukiwanie"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setSelectedTeams([])}
            className={`rounded-md border px-2 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
              noneSelected
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            aria-pressed={noneSelected}
          >
            Wszystkie
          </button>
          {ALL_TEAMS.map((team) => (
            <button
              key={team}
              onClick={() => toggleTeam(team)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                selectedTeams.includes(team)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              aria-pressed={selectedTeams.includes(team)}
            >
              {TEAM_LABELS[team] ?? team}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
