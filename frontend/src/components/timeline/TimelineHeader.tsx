import type { DayInfo, WeekInfo } from "@/hooks/useTimeline";
import type { ViewMode } from "@/stores/timelineStore";

interface MonthInfo {
  label: string;
  key: string;
}

interface TimelineHeaderProps {
  viewMode: ViewMode;
  months: MonthInfo[];
  workingDaysPerMonth: Record<string, number>;
  weeks: WeekInfo[];
  allDays: DayInfo[];
  holidayMap: Record<string, string>;
}

const MONTH_WIDTH = 200;
const DAY_WIDTH = 40;

export function TimelineHeader({
  viewMode,
  months,
  workingDaysPerMonth,
  weeks,
  allDays,
  holidayMap,
}: TimelineHeaderProps) {
  if (viewMode === "weekly") {
    return (
      <div>
        {/* Top row: week labels */}
        <div className="flex">
          {weeks.map((week) => (
            <div
              key={week.weekNumber}
              className="flex-shrink-0 border-b border-r px-2 py-1 text-center"
              style={{ width: week.days.length * DAY_WIDTH }}
            >
              <div className="truncate text-xs font-medium">{week.label}</div>
            </div>
          ))}
        </div>
        {/* Bottom row: day columns */}
        <div className="flex">
          {allDays.map((day) => {
            const holidayName = holidayMap[day.key];
            const isHoliday = !!holidayName;
            return (
              <div
                key={day.key}
                className={`flex-shrink-0 border-r px-0.5 py-1 text-center ${
                  day.isWeekend || isHoliday ? "bg-muted/60" : ""
                }`}
                style={{ width: DAY_WIDTH }}
                title={holidayName}
              >
                <div
                  className={`text-[10px] font-medium ${
                    isHoliday ? "text-red-500" : ""
                  }`}
                >
                  {day.label}
                </div>
                <div className="text-[9px] text-muted-foreground">
                  {day.key.slice(8)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Monthly view
  return (
    <div className="flex">
      {months.map((month) => {
        const wd = workingDaysPerMonth[month.key] ?? 0;
        const hours = wd * 8;
        return (
          <div
            key={month.key}
            className="flex-shrink-0 border-r px-3 py-2"
            style={{ width: MONTH_WIDTH }}
          >
            <div className="text-sm font-medium capitalize">{month.label}</div>
            <div className="text-xs text-muted-foreground">
              {wd} dni | {hours}h
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { MONTH_WIDTH, DAY_WIDTH };
