import {
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  parseISO,
  max as dateMax,
  min as dateMin,
  addDays,
  addWeeks,
  format,
  getISOWeek,
  getDay,
} from "date-fns";
import { pl } from "date-fns/locale";
import type { MonthDef, DateRange, DayInfo, WeekInfo } from "@/types/timeline";
import { MONTH_WIDTH, DAY_WIDTH } from "@/components/timeline/TimelineHeader";

const DAY_LABELS = ["Nd", "Pn", "Wt", "Śr", "Czw", "Pt", "Sb"];

export interface BarPosition {
  left: number;
  width: number;
  visibleStart: Date;
}

/** Pixel X of a date on the monthly timeline (proportional within each month column). */
export function getMonthlyPixelPosition(date: Date, months: MonthDef[]): number {
  const monthIndex = months.findIndex(
    (m) => m.year === date.getFullYear() && m.month === date.getMonth() + 1,
  );
  if (monthIndex < 0) {
    if (date < startOfMonth(new Date(months[0].year, months[0].month - 1, 1)))
      return 0;
    return months.length * MONTH_WIDTH;
  }
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;
  const dayOffset = differenceInCalendarDays(date, monthStart);
  return monthIndex * MONTH_WIDTH + (dayOffset / daysInMonth) * MONTH_WIDTH;
}

/** Inverse of getMonthlyPixelPosition: pixel X on the monthly timeline → date. */
export function getDateFromMonthlyPixelPosition(
  timelineX: number,
  months: MonthDef[],
): Date {
  if (months.length === 0) {
    return new Date();
  }
  const maxX = months.length * MONTH_WIDTH;
  const clampedX = Math.max(0, Math.min(timelineX, maxX - Number.EPSILON));
  const monthIndex = Math.min(
    Math.floor(clampedX / MONTH_WIDTH),
    months.length - 1,
  );
  const m = months[monthIndex];
  const monthStart = startOfMonth(new Date(m.year, m.month - 1, 1));
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = differenceInCalendarDays(monthEnd, monthStart) + 1;
  const relWithinMonth = clampedX - monthIndex * MONTH_WIDTH;
  const dayOffset = Math.min(
    Math.floor((relWithinMonth / MONTH_WIDTH) * daysInMonth),
    daysInMonth - 1,
  );
  return addDays(monthStart, dayOffset);
}

/** Bar position (left/width) for a date range on the monthly timeline, or null if outside. */
export function computeBarPositionMonthly(
  item: DateRange,
  months: MonthDef[],
): BarPosition | null {
  if (months.length === 0) return null;

  const aStart = parseISO(item.start_date);
  const aEnd = parseISO(item.end_date);

  const firstMonthStart = startOfMonth(
    new Date(months[0].year, months[0].month - 1, 1),
  );
  const lastMonth = months[months.length - 1];
  const lastMonthEnd = endOfMonth(
    new Date(lastMonth.year, lastMonth.month - 1, 1),
  );

  if (aEnd < firstMonthStart || aStart > lastMonthEnd) return null;

  const visibleStart = dateMax([aStart, firstMonthStart]);
  const visibleEnd = dateMin([aEnd, lastMonthEnd]);

  const left = getMonthlyPixelPosition(visibleStart, months);
  const right = getMonthlyPixelPosition(addDays(visibleEnd, 1), months);

  return {
    left,
    width: right - left,
    visibleStart,
  };
}

/** Bar position (left/width) for a date range on the weekly timeline, or null if outside. */
export function computeBarPositionWeekly(
  item: DateRange,
  allDays: DayInfo[],
): BarPosition | null {
  if (allDays.length === 0) return null;

  const aStart = parseISO(item.start_date);
  const aEnd = parseISO(item.end_date);

  const firstDay = allDays[0].date;
  const lastDay = allDays[allDays.length - 1].date;

  if (aEnd < firstDay || aStart > lastDay) return null;

  const visibleStart = dateMax([aStart, firstDay]);
  const visibleEnd = dateMin([aEnd, lastDay]);

  const leftDays = differenceInCalendarDays(visibleStart, firstDay);
  const spanDays = differenceInCalendarDays(visibleEnd, visibleStart) + 1;

  return {
    left: leftDays * DAY_WIDTH,
    width: spanDays * DAY_WIDTH,
    visibleStart,
  };
}

/** Whether resize handles should be shown for a bar (hidden when the true edge is off-screen). */
export function getResizeHandleVisibility(
  assignment: DateRange,
  isWeekly: boolean,
  months: MonthDef[],
  allDays: DayInfo[],
): { showResizeLeft: boolean; showResizeRight: boolean } {
  if (isWeekly) {
    if (allDays.length === 0) {
      return { showResizeLeft: false, showResizeRight: false };
    }
    const firstKey = allDays[0].key;
    const lastKey = allDays[allDays.length - 1].key;
    return {
      showResizeLeft: assignment.start_date >= firstKey,
      showResizeRight: assignment.end_date <= lastKey,
    };
  }
  if (months.length === 0) {
    return { showResizeLeft: false, showResizeRight: false };
  }
  const firstKey = format(
    startOfMonth(new Date(months[0].year, months[0].month - 1, 1)),
    "yyyy-MM-dd",
  );
  const lastM = months[months.length - 1];
  const lastKey = format(
    endOfMonth(new Date(lastM.year, lastM.month - 1, 1)),
    "yyyy-MM-dd",
  );
  return {
    showResizeLeft: assignment.start_date >= firstKey,
    showResizeRight: assignment.end_date <= lastKey,
  };
}

/** Find the first non-overlapping row for a bar and register it. */
export function assignRow(
  pos: { left: number; width: number },
  occupiedRows: { left: number; right: number; row: number }[],
): number {
  let row = 0;
  const right = pos.left + pos.width;
  while (
    occupiedRows.some(
      (o) => o.row === row && pos.left < o.right && right > o.left,
    )
  ) {
    row++;
  }
  occupiedRows.push({ left: pos.left, right, row });
  return row;
}

/** Generate `count` consecutive weeks (7 days each) starting at `start`. */
export function generateWeeks(start: Date, count: number): WeekInfo[] {
  const weeks: WeekInfo[] = [];
  let current = new Date(start);

  for (let w = 0; w < count; w++) {
    const weekStart = current;
    const weekEnd = addDays(weekStart, 6);
    const weekNum = getISOWeek(weekStart);

    const days: DayInfo[] = [];
    for (let d = 0; d < 7; d++) {
      const day = addDays(weekStart, d);
      const dow = getDay(day); // 0=Sun, 1=Mon, ...
      days.push({
        date: day,
        key: format(day, "yyyy-MM-dd"),
        dayOfWeek: dow === 0 ? 7 : dow, // ISO: 1=Mon, 7=Sun
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
