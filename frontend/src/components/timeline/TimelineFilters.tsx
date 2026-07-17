import { useState } from "react";
import { ChevronLeft, ChevronRight, Percent, Users, Code2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterButton } from "@/components/common/FilterButton";
import { FilterChipPanel } from "@/components/common/FilterChipPanel";
import { useTeams } from "@/hooks/useTeams";
import { useTechnologies } from "@/hooks/useTechnologies";
import { useTimelineStore } from "@/stores/timelineStore";
import { pluralizePl } from "@/lib/pluralizePl";
import type { ViewMode, OccupancyFilter } from "@/types/timeline";

type OpenPanel = "teams" | "technologies" | "occupancy" | null;

export function TimelineFilters({ count }: { count?: number }) {
  const {
    viewMode,
    setViewMode,
    selectedTeamIds,
    setSelectedTeamIds,
    selectedTechnologyIds,
    setSelectedTechnologyIds,
    searchQuery,
    setSearchQuery,
    scrollBack,
    scrollForward,
    goToToday,
    occupancyFilter,
    setOccupancyFilter,
  } = useTimelineStore();

  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: technologies = [], isLoading: technologiesLoading } =
    useTechnologies();

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [draftMinPct, setDraftMinPct] = useState("");
  const [draftMaxPct, setDraftMaxPct] = useState("");

  const isOccupancyActive =
    occupancyFilter !== null &&
    (occupancyFilter.dateFrom !== null ||
      occupancyFilter.dateTo !== null ||
      occupancyFilter.minPct !== null ||
      occupancyFilter.maxPct !== null);

  const anyFilterActive =
    selectedTeamIds.length > 0 ||
    selectedTechnologyIds.length > 0 ||
    isOccupancyActive ||
    searchQuery.trim() !== "";

  const togglePanel = (panel: Exclude<OpenPanel, null>) =>
    setOpenPanel((p) => (p === panel ? null : panel));

  const toggleOccupancyPanel = () => {
    if (openPanel !== "occupancy") {
      setDraftDateFrom(occupancyFilter?.dateFrom ?? "");
      setDraftDateTo(occupancyFilter?.dateTo ?? "");
      setDraftMinPct(occupancyFilter?.minPct?.toString() ?? "");
      setDraftMaxPct(occupancyFilter?.maxPct?.toString() ?? "");
      setOpenPanel("occupancy");
    } else {
      setOpenPanel(null);
    }
  };

  const handleApply = () => {
    const minPct = draftMinPct !== "" ? parseInt(draftMinPct, 10) : null;
    const maxPct = draftMaxPct !== "" ? parseInt(draftMaxPct, 10) : null;
    const dateFrom = draftDateFrom || null;
    const dateTo = draftDateTo || null;

    if (minPct === null && maxPct === null && dateFrom === null && dateTo === null) {
      setOccupancyFilter(null);
    } else {
      const filter: OccupancyFilter = { dateFrom, dateTo, minPct, maxPct };
      setOccupancyFilter(filter);
    }
    setOpenPanel(null);
  };

  const handleClearOccupancy = () => {
    setDraftDateFrom("");
    setDraftDateTo("");
    setDraftMinPct("");
    setDraftMaxPct("");
    setOccupancyFilter(null);
    setOpenPanel(null);
  };

  const clearAllFilters = () => {
    setSelectedTeamIds([]);
    setSelectedTechnologyIds([]);
    setOccupancyFilter(null);
    setSearchQuery("");
    setOpenPanel(null);
  };

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

      {/* Row 2: Search + filters */}
      <div className="flex items-center gap-3">
        <SearchInput
          className="w-56"
          placeholder="Szukaj pracownika..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

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

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        <FilterButton
          label="Obłożenie"
          icon={Percent}
          active={isOccupancyActive}
          open={openPanel === "occupancy"}
          onClick={toggleOccupancyPanel}
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

        {count !== undefined && (
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {count}{" "}
            {pluralizePl(count, ["pracownik", "pracownicy", "pracowników"])}
          </span>
        )}
      </div>

      {/* Expandable panels */}
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
      {openPanel === "occupancy" && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-md border bg-muted/40 px-4 py-3">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Okres</span>
            <Input
              type="date"
              value={draftDateFrom}
              onChange={(e) => setDraftDateFrom(e.target.value)}
              className="h-7 w-32 text-xs"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              value={draftDateTo}
              onChange={(e) => setDraftDateTo(e.target.value)}
              min={draftDateFrom || undefined}
              className="h-7 w-32 text-xs"
            />
          </div>

          {/* Occupancy range */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Obłożenie</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={draftMinPct}
              onChange={(e) => setDraftMinPct(e.target.value.replace(/[^0-9]/g, ""))}
              className="h-7 w-11 px-2 text-xs"
            />
            <span className="text-xs text-muted-foreground">%</span>
            <span className="text-muted-foreground">–</span>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="∞"
              value={draftMaxPct}
              onChange={(e) => setDraftMaxPct(e.target.value.replace(/[^0-9]/g, ""))}
              className="h-7 w-11 px-2 text-xs"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleApply}>
              Zastosuj
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleClearOccupancy}
            >
              Wyczyść
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
