import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Code2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterButton } from "@/components/common/FilterButton";
import { FilterChipPanel } from "@/components/common/FilterChipPanel";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useTeams } from "@/hooks/useTeams";
import { useTechnologies } from "@/hooks/useTechnologies";
import { useDashboardStore } from "@/stores/dashboardStore";

type OpenPanel = "teams" | "technologies" | null;

const yearButtonClass =
  "px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

export function DashboardFilters() {
  const {
    year,
    stepYear,
    selectedTeamIds,
    setSelectedTeamIds,
    selectedTechnologyIds,
    setSelectedTechnologyIds,
  } = useDashboardStore();

  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: technologies = [], isLoading: technologiesLoading } =
    useTechnologies();

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  useClickOutside(filterRef, () => setOpenPanel(null), openPanel !== null);

  const anyFilterActive =
    selectedTeamIds.length > 0 || selectedTechnologyIds.length > 0;

  const togglePanel = (panel: Exclude<OpenPanel, null>) =>
    setOpenPanel((p) => (p === panel ? null : panel));

  const clearAllFilters = () => {
    setSelectedTeamIds([]);
    setSelectedTechnologyIds([]);
    setOpenPanel(null);
  };

  return (
    <div className="space-y-2" ref={filterRef}>
      <div className="flex items-center gap-3">
        {/* The arrows flank the year they change, so what they do needs no label. */}
        <div className="flex items-center rounded-md border">
          <button
            onClick={() => stepYear(-1)}
            className={`${yearButtonClass} rounded-l-md`}
            aria-label="Poprzedni rok"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-14 px-1 text-center text-sm font-medium tabular-nums">
            {year}
          </span>
          <button
            onClick={() => stepYear(1)}
            className={`${yearButtonClass} rounded-r-md`}
            aria-label="Następny rok"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-border" />

        <FilterButton
          label="Zespoły"
          icon={Users}
          count={selectedTeamIds.length}
          active={selectedTeamIds.length > 0}
          open={openPanel === "teams"}
          onClick={() => togglePanel("teams")}
        />

        <FilterButton
          label="Technologie"
          icon={Code2}
          count={selectedTechnologyIds.length}
          active={selectedTechnologyIds.length > 0}
          open={openPanel === "technologies"}
          onClick={() => togglePanel("technologies")}
        />

        {anyFilterActive && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={clearAllFilters}
          >
            <X className="mr-1 h-3 w-3" />
            Wyczyść
          </Button>
        )}
      </div>

      {openPanel === "teams" && (
        <FilterChipPanel
          options={teams}
          selectedIds={selectedTeamIds}
          onChange={setSelectedTeamIds}
          isLoading={teamsLoading}
          emptyLabel="Brak zespołów"
        />
      )}
      {openPanel === "technologies" && (
        <FilterChipPanel
          options={technologies}
          selectedIds={selectedTechnologyIds}
          onChange={setSelectedTechnologyIds}
          isLoading={technologiesLoading}
          emptyLabel="Brak technologii"
        />
      )}
    </div>
  );
}
