import { format, parse } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { monthKey } from "@/stores/dashboardStore";
import type { MonthTabsProps } from "@/types/dashboard";

const MONTH_COUNT = 12;

function monthLabel(month: string): string {
  return format(parse(month, "yyyy-MM", new Date()), "LLL", { locale: pl });
}

export function MonthTabs({
  months,
  selectedMonth,
  onSelect,
  isLoading,
}: MonthTabsProps) {
  const currentMonth = monthKey(new Date());

  if (isLoading) {
    return (
      <div className="flex gap-1">
        {Array.from({ length: MONTH_COUNT }).map((_, i) => (
          <div key={i} className="h-9 w-16 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label="Miesiąc">
      {months.map((month) => {
        const isSelected = month.month === selectedMonth;
        const isCurrent = month.month === currentMonth;
        return (
          <button
            key={month.month}
            role="tab"
            aria-selected={isSelected}
            aria-current={isCurrent ? "date" : undefined}
            onClick={() => onSelect(month.month)}
            title={isCurrent ? "Bieżący miesiąc" : undefined}
            className={cn(
              "min-w-16 rounded-md border px-3 py-1.5 text-sm capitalize transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
              // Months with no capacity at all read as inactive rather than
              // as a month with genuinely zero demand.
              !isSelected &&
                month.capacity_hours === 0 &&
                "text-muted-foreground",
              // Today's month carries the accent even when unselected, so it
              // reads at a glance without adding a glyph or a label.
              !isSelected &&
                isCurrent &&
                "border-primary text-primary font-semibold",
            )}
          >
            {monthLabel(month.month)}
          </button>
        );
      })}
    </div>
  );
}
