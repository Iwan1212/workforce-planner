import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { formatHours } from "@/lib/capacity";
import { pluralizePl } from "@/lib/pluralizePl";
import { cn } from "@/lib/utils";
import type { MonthStatCardsProps } from "@/types/dashboard";

const CARD_COUNT = 6;

/** Share of `base`, to one decimal. Zero when there is no availability. */
function percentOf(value: number, base: number): number {
  if (base <= 0) return 0;
  return Math.round((value / base) * 1000) / 10;
}

function StatCard({
  label,
  value,
  hint,
  valueClassName,
}: {
  label: string;
  value: string;
  hint: ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <div className="px-4 text-xs font-medium text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "px-4 text-2xl font-semibold tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </div>
      <div className="px-4 text-xs text-muted-foreground">{hint}</div>
    </Card>
  );
}

export function MonthStatCards({ summary, isLoading }: MonthStatCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: CARD_COUNT }).map((_, i) => (
          <Card key={i} className="gap-2 py-4">
            <div className="mx-4 h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="mx-4 h-7 w-20 animate-pulse rounded bg-muted" />
            <div className="mx-4 h-3 w-16 animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>
    );
  }

  const isOverbooked = summary.remaining_hours < 0;
  const overbookedCount = summary.overbooked_employee_count;
  const unassignedCount = summary.unassigned_assignment_count;

  // The four tiles after this one split the month's total up, so each is shown
  // as a share of it and together they account for the whole month.
  const shareOfTotal = (hours: number) =>
    `${percentOf(hours, summary.capacity_hours)}% całości`;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Łącznie"
        value={formatHours(summary.capacity_hours)}
        hint={
          <>
            {summary.employee_count}{" "}
            {pluralizePl(summary.employee_count, [
              "pracownik",
              "pracownicy",
              "pracowników",
            ])}
            , {summary.working_days} dni roboczych
          </>
        }
      />

      <StatCard
        label="Potwierdzone"
        value={formatHours(summary.confirmed_hours)}
        hint={shareOfTotal(summary.confirmed_hours)}
      />

      <StatCard
        label="Niepotwierdzone"
        value={formatHours(summary.tentative_hours)}
        hint={shareOfTotal(summary.tentative_hours)}
      />

      <StatCard
        label="Urlopy"
        value={formatHours(summary.vacation_hours)}
        hint={shareOfTotal(summary.vacation_hours)}
      />

      <StatCard
        label="Do zagospodarowania"
        value={formatHours(summary.remaining_hours)}
        valueClassName={isOverbooked ? "text-red-600" : undefined}
        hint={
          <>
            {/* Occupancy is measured against workable hours, not availability,
                which is what makes it equal to the timeline's badges. */}
            <div>Obłożenie w miesiącu: {summary.utilization_percentage}%</div>
            {/* Individual overbooking hides inside a positive total, so it is
                worth naming even when the month as a whole has slack. */}
            {overbookedCount > 0 && (
              <div className="text-red-600">
                {overbookedCount}{" "}
                {pluralizePl(overbookedCount, [
                  "osoba przeciążona",
                  "osoby przeciążone",
                  "osób przeciążonych",
                ])}
              </div>
            )}
          </>
        }
      />

      <StatCard
        label="Bez przypisania"
        value={formatHours(summary.unassigned_demand_hours)}
        hint={`${unassignedCount} ${pluralizePl(unassignedCount, [
          "assignment",
          "assignmenty",
          "assignmentów",
        ])}`}
      />
    </div>
  );
}
