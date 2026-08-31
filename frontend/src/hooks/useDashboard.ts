import { useQuery } from "@tanstack/react-query";
import { fetchDashboardSummary } from "@/api/dashboard";
import { useDashboardStore } from "@/stores/dashboardStore";
import type { MonthSummary } from "@/types/dashboard";

/**
 * Monthly summary for the selected year.
 *
 * The whole year is fetched in one request, so clicking through the month tabs
 * is instant and only a year change or a filter change refetches.
 */
export function useDashboard() {
  const { year, selectedMonth, selectedTeamIds, selectedTechnologyIds } =
    useDashboardStore();

  const query = useQuery({
    queryKey: ["dashboard", year, selectedTeamIds, selectedTechnologyIds],
    queryFn: () =>
      fetchDashboardSummary(
        `${year}-01-01`,
        `${year}-12-31`,
        selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
        selectedTechnologyIds.length > 0 ? selectedTechnologyIds : undefined,
      ),
  });

  const months: MonthSummary[] = query.data?.months ?? [];
  const selectedSummary =
    months.find((m) => m.month === selectedMonth) ?? months[0];

  return { ...query, months, selectedSummary, selectedMonth, year };
}
