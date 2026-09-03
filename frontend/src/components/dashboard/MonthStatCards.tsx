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

/**
 * `total` is the month's capacity, so it carries the row's only inverted
 * surface: everything beside it is a part of it. `outside` marks the one tile
 * that is not a term of the equation at all, by treatment rather than by hue,
 * since the product's palette has no spare colour to spend on it.
 */
type StatCardTone = "default" | "total" | "outside";

function StatCard({
  label,
  value,
  hint,
  tone = "default",
  valueClassName,
}: {
  label: string;
  value: string;
  hint: ReactNode;
  tone?: StatCardTone;
  valueClassName?: string;
}) {
  const isTotal = tone === "total";
  const isOutside = tone === "outside";
  return (
    <Card
      className={cn(
        "gap-1 py-4",
        isTotal && "border-foreground bg-foreground text-background",
        isOutside && "border-info/40 bg-info/8",
      )}
    >
      <div
        className={cn(
          "px-4 text-xs font-medium",
          isTotal && "text-background/70",
          isOutside && "text-info",
          !isTotal && !isOutside && "text-muted-foreground",
        )}
      >
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
      <div
        className={cn(
          "px-4 text-xs",
          isTotal ? "text-background/70" : "text-muted-foreground",
        )}
      >
        {hint}
      </div>
    </Card>
  );
}

export function MonthStatCards({ summary, isLoading }: MonthStatCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: CARD_COUNT }).map((_, i) => (
            <Card key={i} className="gap-2 py-4">
              <div className="mx-4 h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="mx-4 h-7 w-20 animate-pulse rounded bg-muted" />
              <div className="mx-4 h-3 w-16 animate-pulse rounded bg-muted" />
            </Card>
          ))}
        </div>
        <div className="h-8 animate-pulse rounded-md bg-muted" />
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

  // The accent marks the second cut through these hours wherever it appears,
  // here and on the strip below the row, so the two read as one idea.
  const internalShareLine = (hours: number) =>
    hours > 0 ? (
      <div className="text-primary">w tym wewnętrzne {formatHours(hours)}</div>
    ) : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Łącznie"
        tone="total"
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
        hint={
          <>
            <div>{shareOfTotal(summary.confirmed_hours)}</div>
            {internalShareLine(summary.internal_confirmed_hours)}
          </>
        }
      />

      <StatCard
        label="Niepotwierdzone"
        value={formatHours(summary.tentative_hours)}
        hint={
          <>
            <div>{shareOfTotal(summary.tentative_hours)}</div>
            {internalShareLine(summary.internal_tentative_hours)}
          </>
        }
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
        tone="outside"
        value={formatHours(summary.unassigned_demand_hours)}
        hint={
          <>
            <div>
              {unassignedCount}{" "}
              {pluralizePl(unassignedCount, [
                "assignment",
                "assignmenty",
                "assignmentów",
              ])}
            </div>
            {summary.unassigned_demand_hours > 0 && (
              <div className="text-info">
                w tym potwierdzone{" "}
                {formatHours(summary.unassigned_confirmed_hours)}
              </div>
            )}
          </>
        }
      />

     </div>

      {/* One line rather than a second row of tiles: the client/internal cut
          is a different question about the same hours, and the row above is
          where the month's attention belongs. */}
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-md bg-primary/8 px-4 py-3 text-sm tabular-nums">
        <span className="text-muted-foreground">Zaplanowane</span>
        <span className="font-semibold">
          {formatHours(summary.allocated_hours)}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Klienckie</span>
        <span className="font-semibold">
          {formatHours(summary.client_hours)}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">Wewnętrzne</span>
        <span className="font-semibold">
          {formatHours(summary.internal_hours)}
        </span>
        <span className="text-muted-foreground">
          ({summary.internal_percentage}% zaplanowanego czasu)
        </span>
      </div>
    </div>
  );
}
