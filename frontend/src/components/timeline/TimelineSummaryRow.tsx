import { useMemo } from "react";
import {
  parseISO,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
} from "date-fns";
import type { TimelineSummaryRowProps, DaySummary } from "@/types/timeline";
import { getUtilColor } from "@/lib/constants";
import { MONTH_WIDTH, DAY_WIDTH } from "./TimelineHeader";

export function TimelineSummaryRow({
  employees,
  viewMode,
  months,
  allDays,
  holidayMap,
}: TimelineSummaryRowProps) {
  // Compute per-day summary for weekly view
  const weeklyDaySummaries = useMemo(() => {
    if (viewMode !== "weekly") return new Map<string, DaySummary>();

    const map = new Map<string, DaySummary>();
    for (const day of allDays) {
      if (day.isWeekend || holidayMap[day.key]) {
        map.set(day.key, { totalHours: 0, employeeCount: 0, ftePct: 0 });
        continue;
      }

      let totalHours = 0;
      let activeEmployees = 0;

      for (const emp of employees) {
        activeEmployees++;
        for (const a of emp.assignments) {
          const aStart = parseISO(a.start_date);
          const aEnd = parseISO(a.end_date);
          if (isWithinInterval(day.date, { start: aStart, end: aEnd })) {
            totalHours += a.daily_hours;
          }
        }
      }

      const availableHours = activeEmployees * 8;
      const ftePct =
        availableHours > 0
          ? Math.round((totalHours / availableHours) * 100)
          : 0;

      map.set(day.key, {
        totalHours: Math.round(totalHours * 10) / 10,
        employeeCount: activeEmployees,
        ftePct,
      });
    }

    return map;
  }, [viewMode, allDays, employees, holidayMap]);

  // Compute per-month summary for monthly view
  const monthlySummaries = useMemo(() => {
    if (viewMode !== "monthly") return new Map<string, DaySummary>();

    const map = new Map<string, DaySummary>();
    for (const m of months) {
      const mStart = startOfMonth(new Date(m.year, m.month - 1, 1));
      const mEnd = endOfMonth(mStart);
      const days = eachDayOfInterval({ start: mStart, end: mEnd });

      let totalHours = 0;
      let workingDayCount = 0;

      for (const day of days) {
        const dayKey = format(day, "yyyy-MM-dd");
        const dow = day.getDay();
        if (dow === 0 || dow === 6 || holidayMap[dayKey]) continue;
        workingDayCount++;

        for (const emp of employees) {
          for (const a of emp.assignments) {
            const aStart = parseISO(a.start_date);
            const aEnd = parseISO(a.end_date);
            if (isWithinInterval(day, { start: aStart, end: aEnd })) {
              totalHours += a.daily_hours;
            }
          }
        }
      }

      const availableHours = employees.length * workingDayCount * 8;
      const ftePct =
        availableHours > 0
          ? Math.round((totalHours / availableHours) * 100)
          : 0;

      map.set(m.key, {
        totalHours: Math.round(totalHours),
        employeeCount: employees.length,
        ftePct,
      });
    }

    return map;
  }, [viewMode, months, employees, holidayMap]);

  const isWeekly = viewMode === "weekly";
  const totalWidth = isWeekly
    ? allDays.length * DAY_WIDTH
    : months.length * MONTH_WIDTH;

  return (
    <div className="flex border-b bg-muted/30">
      {/* Left label */}
      <div className="sticky left-0 z-10 flex w-[250px] shrink-0 items-center border-r bg-muted/50 px-3 py-1">
        <span className="text-xs font-medium text-muted-foreground">
          Suma alokacji
        </span>
      </div>

      {/* Summary cells */}
      <div className="flex" style={{ minWidth: totalWidth }}>
        {isWeekly
          ? allDays.map((day) => {
              const summary = weeklyDaySummaries.get(day.key);
              const isOff = day.isWeekend || !!holidayMap[day.key];
              return (
                <div
                  key={day.key}
                  className={`flex flex-col items-center justify-center border-r text-center ${
                    isOff ? "bg-muted/40" : ""
                  }`}
                  style={{ width: DAY_WIDTH, minHeight: 28 }}
                >
                  {isOff ? (
                    <span className="text-[9px] text-muted-foreground">—</span>
                  ) : (
                    <>
                      <span
                        className={`text-[9px] ${getUtilColor(summary?.ftePct ?? 0)}`}
                      >
                        {summary?.ftePct ?? 0}%
                      </span>
                    </>
                  )}
                </div>
              );
            })
          : months.map((m) => {
              const summary = monthlySummaries.get(m.key);
              return (
                <div
                  key={m.key}
                  className="flex items-center justify-center border-r"
                  style={{ width: MONTH_WIDTH, minHeight: 28 }}
                >
                  <span
                    className={`text-xs ${getUtilColor(summary?.ftePct ?? 0)}`}
                  >
                    {summary?.totalHours ?? 0}h / {summary?.ftePct ?? 0}%
                  </span>
                </div>
              );
            })}
      </div>
    </div>
  );
}
