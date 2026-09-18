import { useMemo } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { formatHours } from "@/lib/capacity";
import { getUtilColor } from "@/lib/constants";
import { pluralizePl } from "@/lib/pluralizePl";
import { cn } from "@/lib/utils";
import type { DataTableColumn } from "@/types/ui";
import type { TeamBreakdownTableProps, TeamSummary } from "@/types/dashboard";

function remainingClass(hours: number): string {
  return hours < 0 ? "text-red-600 font-medium" : "";
}

/**
 * Team name over its headcount. Spans (not divs) so the whole thing stays
 * valid inside the button the clickable variant wraps it in.
 */
function TeamIdentity({ row }: { row: TeamSummary }) {
  return (
    <>
      <span className="block">{row.team_name}</span>
      <span className="block text-xs text-muted-foreground">
        {row.employee_count}{" "}
        {pluralizePl(row.employee_count, [
          "pracownik",
          "pracownicy",
          "pracowników",
        ])}
        {row.overbooked_employee_count > 0 && (
          <span className="text-red-600">
            {" "}
            ({row.overbooked_employee_count} przeciążonych)
          </span>
        )}
      </span>
    </>
  );
}

/** The first column, clickable into the calendar when there is a team to filter on. */
function TeamCell({
  row,
  onTeamClick,
}: {
  row: TeamSummary;
  onTeamClick?: (teamId: number) => void;
}) {
  // The no-team bucket is not a team, so there is nothing for the calendar's
  // team filter to select: it stays plain text.
  if (row.team_id === null || !onTeamClick) {
    return (
      <div>
        <TeamIdentity row={row} />
      </div>
    );
  }

  const teamId = row.team_id;
  // Reads exactly like the plain cell it replaces: the button reset already
  // inherits font and colour, so only the pointer and the keyboard focus ring
  // mark it as clickable. Full width so the whole name-and-headcount block
  // takes the click, not just the text.
  return (
    <button
      type="button"
      onClick={() => onTeamClick(teamId)}
      title="Pokaż zespół w kalendarzu pracowników"
      className="block w-full cursor-pointer rounded text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      <TeamIdentity row={row} />
    </button>
  );
}

function teamColumn(
  onTeamClick?: (teamId: number) => void,
): DataTableColumn<TeamSummary> {
  return {
    id: "team",
    header: "Zespół",
    cell: (row) => <TeamCell row={row} onTeamClick={onTeamClick} />,
  };
}

const METRIC_COLUMNS: DataTableColumn<TeamSummary>[] = [
  {
    id: "capacity",
    header: "Łącznie",
    align: "right",
    className: "tabular-nums",
    cell: (row) => formatHours(row.capacity_hours),
  },
  {
    id: "confirmed",
    header: "Potwierdzone",
    align: "right",
    className: "tabular-nums",
    cell: (row) => formatHours(row.confirmed_hours),
  },
  {
    id: "tentative",
    header: "Niepotwierdzone",
    align: "right",
    className: "tabular-nums",
    cell: (row) => formatHours(row.tentative_hours),
  },
  {
    id: "vacation",
    header: "Urlopy",
    align: "right",
    className: "tabular-nums",
    cell: (row) => formatHours(row.vacation_hours),
  },
  {
    id: "remaining",
    header: "Do zagospodarowania",
    align: "right",
    className: "tabular-nums",
    cell: (row) => (
      <span className={remainingClass(row.remaining_hours)}>
        {formatHours(row.remaining_hours)}
      </span>
    ),
  },
  {
    id: "utilization",
    header: "Obłożenie",
    align: "right",
    className: "tabular-nums",
    cell: (row) => (
      <span className={getUtilColor(row.utilization_percentage)}>
        {row.utilization_percentage}%
      </span>
    ),
  },
];

export function TeamBreakdownTable({
  summary,
  isLoading,
  onTeamClick,
}: TeamBreakdownTableProps) {
  const teams = summary?.teams ?? [];
  const columns = useMemo(
    () => [teamColumn(onTeamClick), ...METRIC_COLUMNS],
    [onTeamClick],
  );

  return (
    <DataTable
      data={teams}
      columns={columns}
      getRowKey={(row) => row.team_id ?? "no-team"}
      isLoading={isLoading}
      skeletonRowCount={4}
      emptyContent="Brak pracowników spełniających filtry."
      footer={
        summary && teams.length > 1 ? (
          <tr className="font-medium">
            <td className="px-4 py-3">Razem</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatHours(summary.capacity_hours)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatHours(summary.confirmed_hours)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatHours(summary.tentative_hours)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatHours(summary.vacation_hours)}
            </td>
            <td
              className={cn(
                "px-4 py-3 text-right tabular-nums",
                remainingClass(summary.remaining_hours),
              )}
            >
              {formatHours(summary.remaining_hours)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              <span className={getUtilColor(summary.utilization_percentage)}>
                {summary.utilization_percentage}%
              </span>
            </td>
          </tr>
        ) : undefined
      }
    />
  );
}
