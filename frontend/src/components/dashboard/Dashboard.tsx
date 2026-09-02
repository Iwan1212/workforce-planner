import { useCallback } from "react";
import { format, parse } from "date-fns";
import { pl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { DashboardFilters } from "./DashboardFilters";
import { MonthStatCards } from "./MonthStatCards";
import { MonthTabs } from "./MonthTabs";
import { TeamBreakdownTable } from "./TeamBreakdownTable";
import { useDashboard } from "@/hooks/useDashboard";
import { monthKey, useDashboardStore } from "@/stores/dashboardStore";
import { useTimelineStore } from "@/stores/timelineStore";
import type { DashboardProps } from "@/types/dashboard";

function monthTitle(month: string): string {
  // date-fns yields a lowercase Polish month name; capitalised in JS rather
  // than with the CSS `capitalize` class, which would also touch the year.
  const label = format(parse(month, "yyyy-MM", new Date()), "LLLL yyyy", {
    locale: pl,
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Section title, same typography as the settings section headers. */
function SectionHeading({ title }: { title: string }) {
  return <p className="text-base font-semibold text-foreground">{title}</p>;
}

export function Dashboard({ onNavigate }: DashboardProps = {}) {
  const { setSelectedMonth, goToToday } = useDashboardStore();
  const focusTeam = useTimelineStore((state) => state.focusTeam);
  const { months, selectedSummary, selectedMonth, isLoading, error } =
    useDashboard();

  // Follow a team row into the calendar, landing on the month whose figures
  // were just read rather than on the calendar's own default window.
  const handleTeamClick = useCallback(
    (teamId: number) => {
      focusTeam(teamId, parse(selectedMonth, "yyyy-MM", new Date()));
      onNavigate?.("/timeline");
    },
    [focusTeam, onNavigate, selectedMonth],
  );

  // "Dzisiaj" resets both the year and the month, so it is only redundant
  // when both already point at today.
  const isToday = selectedMonth === monthKey(new Date());

  return (
    <div className="p-6">
      <PageHeader title="Podsumowanie" />

      <div className="mb-6 space-y-3">
        <DashboardFilters />
        <div className="flex flex-wrap items-center gap-2">
          <MonthTabs
            months={months}
            selectedMonth={selectedMonth}
            onSelect={setSelectedMonth}
            isLoading={isLoading}
          />
          {/* Pushed to the far edge: it leaves the month range rather than
              picking a value inside it. */}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={goToToday}
            disabled={isToday}
            title="Wróć do bieżącego roku i miesiąca"
          >
            Dzisiaj
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          Nie udało się pobrać podsumowania: {error.message}
        </div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <SectionHeading
              title={monthTitle(selectedSummary?.month ?? selectedMonth)}
            />
            <MonthStatCards summary={selectedSummary} isLoading={isLoading} />
          </section>

          <section className="space-y-3">
            <SectionHeading title="Podział na zespoły" />
            <TeamBreakdownTable
              summary={selectedSummary}
              isLoading={isLoading}
              onTeamClick={onNavigate ? handleTeamClick : undefined}
            />
          </section>
        </div>
      )}
    </div>
  );
}
