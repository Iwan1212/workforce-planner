import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { useProjectTimelineStore } from "@/stores/projectTimelineStore";
import type { ViewMode } from "@/types/timeline";

export function ProjectTimelineFilters({ count }: { count?: number }) {
  const {
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    scrollBack,
    scrollForward,
    goToToday,
  } = useProjectTimelineStore();

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

      {/* Row 2: Search + count */}
      <div className="flex items-center gap-3">
        <SearchInput
          className="w-56"
          placeholder="Szukaj projektu..."
          value={searchQuery}
          onChange={setSearchQuery}
        />

        {count !== undefined && (
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {count}{" "}
            {count === 1
              ? "projekt"
              : count >= 2 && count <= 4
                ? "projekty"
                : "projektów"}
          </span>
        )}
      </div>
    </div>
  );
}
