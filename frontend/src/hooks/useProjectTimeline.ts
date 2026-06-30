import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "./useDebouncedValue";
import { addMonths, addWeeks, format, addDays, getISOWeek, getDay } from "date-fns";
import { pl } from "date-fns/locale";
import { fetchProjectTimeline } from "@/api/projectTimeline";
import { useProjectTimelineStore } from "@/stores/projectTimelineStore";
import type { DayInfo, WeekInfo } from "@/types/timeline";

const MONTHS_VISIBLE = 7;
const WEEKS_VISIBLE = 6;
const DAY_LABELS = ["Nd", "Pn", "Wt", "Śr", "Czw", "Pt", "Sb"];

function generateWeeks(start: Date, count: number): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  let current = new Date(start);

  for (let w = 0; w < count; w++) {
    const weekStart = current;
    const weekEnd = addDays(weekStart, 6);
    const weekNum = getISOWeek(weekStart);

    const days: DayInfo[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d);
      const dow = getDay(day);
      days.push({
        date: day,
        key: format(day, "yyyy-MM-dd"),
        dayOfWeek: dow === 0 ? 7 : dow,
        label: DAY_LABELS[dow],
        isWeekend: dow === 0 || dow === 6,
      });
    }

    const startLabel = format(weekStart, "d", { locale: pl });
    const endLabel = format(weekEnd, "d MMM", { locale: pl });

    weeks.push({
      weekNumber: weekNum,
      label: `${startLabel}-${endLabel}`,
      days,
    });

    current = addWeeks(current, 1);
  }

  return weeks;
}

export function useProjectTimeline() {
  const { startDate, searchQuery, viewMode } = useProjectTimelineStore();
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);

  const endDate =
    viewMode === "monthly"
      ? addMonths(startDate, MONTHS_VISIBLE)
      : addWeeks(startDate, WEEKS_VISIBLE);

  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");

  const query = useQuery({
    queryKey: ["project-timeline", startStr, endStr, debouncedSearch, viewMode],
    queryFn: () => fetchProjectTimeline(startStr, endStr, debouncedSearch || undefined),
  });

  const months: { year: number; month: number; label: string; key: string }[] = [];
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
