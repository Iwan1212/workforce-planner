import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/SearchInput";
import { TeamFilterChips } from "@/components/common/TeamFilterChips";
import { useTimelineStore } from "@/stores/timelineStore";
import type { ViewMode, UtilizationFilter } from "@/types/timeline";

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
    utilizationFilter,
    setUtilizationFilter,
  } = useTimelineStore();

  const [panelOpen, setPanelOpen] = useState(false);
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [draftMinPct, setDraftMinPct] = useState("");
  const [draftMaxPct, setDraftMaxPct] = useState("");

  const toggleTeam = (team: string) => {
    if (selectedTeams.includes(team)) {
      setSelectedTeams(selectedTeams.filter((t) => t !== team));
    } else {
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const selectAllTeams = () => setSelectedTeams([]);

  const isFilterActive =
    utilizationFilter !== null &&
    (utilizationFilter.dateFrom !== null ||
      utilizationFilter.dateTo !== null ||
      utilizationFilter.minPct !== null ||
      utilizationFilter.maxPct !== null);

  const handleTogglePanel = () => {
    if (!panelOpen) {
      setDraftDateFrom(utilizationFilter?.dateFrom ?? "");
      setDraftDateTo(utilizationFilter?.dateTo ?? "");
      setDraftMinPct(utilizationFilter?.minPct?.toString() ?? "");
      setDraftMaxPct(utilizationFilter?.maxPct?.toString() ?? "");
    }
    setPanelOpen((v) => !v);
  };

  const handleApply = () => {
    const minPct = draftMinPct !== "" ? parseInt(draftMinPct, 10) : null;
    const maxPct = draftMaxPct !== "" ? parseInt(draftMaxPct, 10) : null;
    const dateFrom = draftDateFrom || null;
    const dateTo = draftDateTo || null;

    if (minPct === null && maxPct === null && dateFrom === null && dateTo === null) {
      setUtilizationFilter(null);
    } else {
      const filter: UtilizationFilter = { dateFrom, dateTo, minPct, maxPct };
      setUtilizationFilter(filter);
    }
    setPanelOpen(false);
  };

  const handleClear = () => {
    setDraftDateFrom("");
    setDraftDateTo("");
    setDraftMinPct("");
    setDraftMaxPct("");
    setUtilizationFilter(null);
    setPanelOpen(false);
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

      {/* Row 2: Search + Team filter + Utilization filter button */}
      <div className="flex items-center gap-3">
        <SearchInput
          className="w-56"
          placeholder="Szukaj pracownika..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        <TeamFilterChips
          selectedTeams={selectedTeams}
          onToggleTeam={toggleTeam}
          onSelectAll={selectAllTeams}
        />

        {/* Divider */}
        <div className="h-5 w-px bg-border" />

        {/* Utilization filter button */}
        <button
          onClick={handleTogglePanel}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
            isFilterActive
              ? "border-primary bg-primary text-primary-foreground"
              : panelOpen
                ? "bg-muted"
                : "text-muted-foreground hover:bg-muted"
          }`}
          aria-pressed={panelOpen}
        >
          <Percent className="h-3 w-3" />
          Utylizacja
          {panelOpen ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Utilization filter panel */}
      {panelOpen && (
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
              className="h-7 w-32 text-xs"
            />
          </div>

          {/* Utilization range */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Utylizacja</span>
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
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleClear}>
              Wyczyść
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
