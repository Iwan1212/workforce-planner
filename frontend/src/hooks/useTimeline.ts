import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "./useDebouncedValue";
import { addMonths, addWeeks, format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { fetchTimeline } from "@/api/assignments";
import { useTimelineStore } from "@/stores/timelineStore";
import { generateWeeks } from "@/lib/timelineLayout";
import type { DayInfo, WeekInfo } from "@/types/timeline";

const MONTHS_VISIBLE = 7;
const WEEKS_VISIBLE = 6;

export function useTimeline() {
  const { startDate, selectedTeams, searchQuery, viewMode, occupancyFilter } =
    useTimelineStore();

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);

  const endDate =
    viewMode === "monthly"
      ? addMonths(startDate, MONTHS_VISIBLE)
      : addWeeks(startDate, WEEKS_VISIBLE);

  // Extend API query range to cover occupancy filter dates if they exceed visible range
  let queryStart = startDate;
  let queryEnd = endDate;
  if (occupancyFilter?.dateFrom) {
    const f = parseISO(occupancyFilter.dateFrom);
    if (f < queryStart) queryStart = f;
  }
  if (occupancyFilter?.dateTo) {
    const t = parseISO(occupancyFilter.dateTo);
    if (t > queryEnd) queryEnd = t;
  }

  const startStr = format(queryStart, "yyyy-MM-dd");
  const endStr = format(queryEnd, "yyyy-MM-dd");

  const granularity = viewMode === "weekly" ? "weekly" : "monthly";

  const query = useQuery({
    queryKey: ["timeline", startStr, endStr, selectedTeams, debouncedSearch, viewMode],
    queryFn: () =>
      fetchTimeline(startStr, endStr, selectedTeams, debouncedSearch || undefined, granularity),
  });

  // Generate list of months for monthly header
  const months: { year: number; month: number; label: string; key: string }[] =
    [];
  if (viewMode === "monthly") {
    let current = new Date(startDate);
    for (let i = 0; i < MONTHS_VISIBLE; i++) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        label: format(current, "LLLL yyyy", { locale: pl }),
        key: format(current, "yyyy-MM"),
      });
      current = addMonths(current, 1);
    }
  }

  // Generate weeks/days for weekly header
  const weeks: WeekInfo[] =
    viewMode === "weekly" ? generateWeeks(startDate, WEEKS_VISIBLE) : [];

  const allDays: DayInfo[] = weeks.flatMap((w) => w.days);

  return {
    ...query,
    months,
    weeks,
    allDays,
    startDate,
    endDate,
    viewMode,
  };
}
