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

const COLUMNS: DataTableColumn<TeamSummary>[] = [
  {
    id: "team",
    header: "Zespół",
    cell: (row) => (
      <div>
        <div>{row.team_name}</div>
        <div className="text-xs text-muted-foreground">
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
        </div>
      </div>
    ),
  },
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
}: TeamBreakdownTableProps) {
  const teams = summary?.teams ?? [];

  return (
    <DataTable
      data={teams}
      columns={COLUMNS}
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
