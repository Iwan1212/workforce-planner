import { useDroppable } from "@dnd-kit/core";
import {
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  parseISO,
  max as dateMax,
  min as dateMin,
  isWithinInterval,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { TimelineAssignment, MonthUtilization, VacationInfo } from "@/api/assignments";
import type { DayInfo, WeekInfo } from "@/hooks/useTimeline";
import type { ViewMode } from "@/stores/timelineStore";
import { TimelineBar } from "./TimelineBar";
import { MONTH_WIDTH, DAY_WIDTH } from "./TimelineHeader";

const TEAM_LABELS: Record<string, string> = {
  BA: "BA",
  Backend: "Backend",
  DevOps: "DevOps",
  Frontend: "Frontend",
  ML: "ML",
  Mobile: "Mobile",
  PM: "PM",
  QA: "QA",
  UX_UI_Designer: "UX/UI",
};

interface MonthDef {
  key: string;
  year: number;
  month: number;
}

interface TimelineRowProps {
  employeeId: number;
  name: string;
  team: string | null;
  assignments: TimelineAssignment[];
  vacations?: VacationInfo[];
  utilization: Record<string, MonthUtilization>;
  months: MonthDef[];
  weeks: WeekInfo[];
  allDays: DayInfo[];
  viewMode: ViewMode;
  onAssignmentClick: (assignment: TimelineAssignment) => void;
  onVacationClick: (vacation: VacationInfo) => void;
  onEmptyClick: (employeeId: number, monthKey: string) => void;
  onResizeEnd: (
    assignmentId: number,
    edge: "left" | "right",
    deltaPx: number,
  ) => void;
  holidayMap: Record<string, string>;
  isOdd: boolean;
  readOnly?: boolean;
}

interface DateRange {
  start_date: string;
  end_date: string;
}

function computeBarPositionMonthly(
  item: DateRange,
  months: MonthDef[],
): { left: number; width: number } | null {
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

  const totalDays = differenceInCalendarDays(lastMonthEnd, firstMonthStart) + 1;
  const totalWidth = months.length * MONTH_WIDTH;

  const visibleStart = dateMax([aStart, firstMonthStart]);
  const visibleEnd = dateMin([aEnd, lastMonthEnd]);

  const leftDays = differenceInCalendarDays(visibleStart, firstMonthStart);
  const spanDays = differenceInCalendarDays(visibleEnd, visibleStart) + 1;

  return {
    left: (leftDays / totalDays) * totalWidth,
    width: (spanDays / totalDays) * totalWidth,
  };
}

function computeBarPositionWeekly(
  item: DateRange,
  allDays: DayInfo[],
): { left: number; width: number } | null {
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
  };
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  urlop: "Urlop",
  chorobowe: "Chorobowe",
  inne: "Nieobecność",
};

/** Find the first non-overlapping row for a bar and register it. */
function assignRow(
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

function getUtilColor(pct: number): string {
  if (pct > 100) return "text-red-600 font-bold";
  if (pct > 80) return "text-yellow-600";
  if (pct > 0) return "text-green-600";
  return "text-muted-foreground";
}

/** Compute weekly utilization % from assignments, accounting for vacations. */
function computeWeeklyUtilization(
  week: WeekInfo,
  assignments: TimelineAssignment[],
  vacations: VacationInfo[],
  holidayMap: Record<string, string>,
): number {
  let totalHours = 0;
  let workingDays = 0;
  let vacationDays = 0;

  for (const day of week.days) {
    if (day.isWeekend || holidayMap[day.key]) continue;
    workingDays++;

    const isOnVacation = vacations.some((v) => {
      const vStart = parseISO(v.start_date);
      const vEnd = parseISO(v.end_date);
      return isWithinInterval(day.date, { start: vStart, end: vEnd });
    });

    if (isOnVacation) {
      vacationDays++;
      continue;
    }

    for (const a of assignments) {
      const aStart = parseISO(a.start_date);
      const aEnd = parseISO(a.end_date);
      if (isWithinInterval(day.date, { start: aStart, end: aEnd })) {
        totalHours += a.daily_hours;
      }
    }
  }

  const effectiveWorkingDays = workingDays - vacationDays;
  if (effectiveWorkingDays === 0) return 0;
  const availableHours = effectiveWorkingDays * 8;
  return Math.round((totalHours / availableHours) * 100);
}

export function TimelineRow({
  employeeId,
  name,
  team,
  assignments,
  vacations = [],
  utilization,
  months,
  weeks,
  allDays,
  viewMode,
  holidayMap,
  onAssignmentClick,
  onVacationClick,
  onEmptyClick,
  onResizeEnd,
  isOdd,
  readOnly = false,
}: TimelineRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `employee-${employeeId}`,
    data: { employeeId },
  });

  const isWeekly = viewMode === "weekly";

  // Compute px per day for resize calculations
  let pxPerDay = 1;
  if (isWeekly) {
    pxPerDay = DAY_WIDTH;
  } else if (months.length > 0) {
    const firstMonthStart = startOfMonth(
      new Date(months[0].year, months[0].month - 1, 1),
    );
    const lastMonth = months[months.length - 1];
    const lastMonthEnd = endOfMonth(
      new Date(lastMonth.year, lastMonth.month - 1, 1),
    );
    const totalDays =
      differenceInCalendarDays(lastMonthEnd, firstMonthStart) + 1;
    const totalWidth = months.length * MONTH_WIDTH;
    pxPerDay = totalDays > 0 ? totalWidth / totalDays : 1;
  }

  // Compute overlapping assignments + vacations to stack them
  const occupiedRows: { left: number; right: number; row: number }[] = [];

  const computePos = (item: DateRange) =>
    isWeekly
      ? computeBarPositionWeekly(item, allDays)
      : computeBarPositionMonthly(item, months);

  const bars = assignments.flatMap((assignment) => {
    const pos = computePos(assignment);
    return pos ? [{ assignment, ...pos, row: assignRow(pos, occupiedRows) }] : [];
  });

  const vacationBars = vacations.flatMap((vacation) => {
    const pos = computePos(vacation);
    return pos ? [{ vacation, ...pos, row: assignRow(pos, occupiedRows) }] : [];
  });

  const allBars = [...bars, ...vacationBars];
  const maxRows = allBars.length > 0 ? Math.max(...allBars.map((b) => b.row)) + 1 : 1;
  // Extra space for utilization row at top (16px)
  const utilRowHeight = 18;
  const rowHeight = Math.max(38, maxRows * 32 + 6 + utilRowHeight);

  const totalWidth = isWeekly
    ? allDays.length * DAY_WIDTH
    : months.length * MONTH_WIDTH;

  // Per-period utilization for monthly view (from API)
  const monthUtils = months.map((m) => {
    const u = utilization[m.key];
    return { key: m.key, pct: u ? Math.round(u.percentage) : 0 };
  });

  // Per-period utilization for weekly view (computed client-side)
  const weekUtils = weeks.map((w) => ({
    key: `w-${w.days[0]?.key.slice(0, 4)}-${w.weekNumber}`,
    pct: computeWeeklyUtilization(w, assignments, vacations, holidayMap),
  }));

  return (
    <div
      className={`flex border-b ${isOdd ? "bg-muted/20" : ""} ${
        isOver ? "ring-2 ring-inset ring-primary/50" : ""
      }`}
    >
      {/* Sticky left panel */}
      <div
        className="sticky left-0 z-10 flex w-[250px] flex-shrink-0 items-center gap-2 border-r bg-background px-3 py-2"
        style={{ minHeight: rowHeight }}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{name}</div>
          {team && (
            <Badge variant="secondary" className="mt-0.5 text-[10px]">
              {TEAM_LABELS[team] ?? team}
            </Badge>
          )}
        </div>
      </div>

      {/* Timeline area */}
      <div
        ref={setNodeRef}
        className="relative flex-1"
        style={{
          minWidth: totalWidth,
          minHeight: rowHeight,
        }}
      >
        {/* Per-period utilization indicators */}
        <div
          className="absolute top-0 left-0 flex"
          style={{ height: utilRowHeight }}
        >
          {isWeekly
            ? weeks.map((w, i) => {
                const pct = weekUtils[i].pct;
                return (
                  <div
                    key={`${w.days[0]?.key.slice(0, 4)}-${w.weekNumber}`}
                    className={`flex items-center justify-center text-[10px] ${getUtilColor(pct)}`}
                    style={{ width: w.days.length * DAY_WIDTH }}
                  >
                    {pct}%
                  </div>
                );
              })
            : months.map((m, i) => {
                const pct = monthUtils[i].pct;
                return (
                  <div
                    key={m.key}
                    className={`flex items-center justify-center text-[10px] ${getUtilColor(pct)}`}
                    style={{ width: MONTH_WIDTH }}
                  >
                    {pct}%
                  </div>
                );
              })}
        </div>

        {/* Separators */}
        {isWeekly
          ? allDays.map((day, i) => {
              const isHoliday = !!holidayMap[day.key];
              return (
                <div
                  key={day.key}
                  role={readOnly ? undefined : "button"}
                  tabIndex={readOnly ? undefined : 0}
                  aria-label={readOnly ? undefined : `Dodaj assignment ${day.key}`}
                  className={`absolute border-r border-dashed border-muted-foreground/20 ${readOnly ? "" : "cursor-pointer"} ${
                    day.isWeekend || isHoliday ? "bg-muted/40" : ""
                  }`}
                  style={{
                    left: i * DAY_WIDTH,
                    width: DAY_WIDTH,
                    top: utilRowHeight,
                    height: `calc(100% - ${utilRowHeight}px)`,
                  }}
                  title={holidayMap[day.key]}
                  onClick={readOnly ? undefined : () => onEmptyClick(employeeId, day.key.slice(0, 7))}
                  onKeyDown={readOnly ? undefined : (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEmptyClick(employeeId, day.key.slice(0, 7));
                    }
                  }}
                />
              );
            })
          : months.map((m, i) => (
              <div
                key={m.key}
                role={readOnly ? undefined : "button"}
                tabIndex={readOnly ? undefined : 0}
                aria-label={readOnly ? undefined : `Dodaj assignment ${m.key}`}
                className={`absolute border-r border-dashed border-muted-foreground/20 ${readOnly ? "" : "cursor-pointer"}`}
                style={{
                  left: i * MONTH_WIDTH,
                  width: MONTH_WIDTH,
                  top: utilRowHeight,
                  height: `calc(100% - ${utilRowHeight}px)`,
                }}
                onClick={readOnly ? undefined : () => onEmptyClick(employeeId, m.key)}
                onKeyDown={readOnly ? undefined : (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onEmptyClick(employeeId, m.key);
                  }
                }}
              />
            ))}

        {/* Assignment bars */}
        {bars.map((bar) => (
          <div
            key={bar.assignment.id}
            className="absolute"
            style={{ top: bar.row * 32 + 2 + utilRowHeight }}
          >
            <TimelineBar
              assignment={bar.assignment}
              employeeId={employeeId}
              left={bar.left}
              width={bar.width}
              onClick={() => onAssignmentClick(bar.assignment)}
              onResizeEnd={onResizeEnd}
              pxPerDay={pxPerDay}
              showDailyHours={isWeekly}
              readOnly={readOnly}
            />
          </div>
        ))}

        {/* Vacation bars */}
        {vacationBars.map((vbar, i) => {
          const label = LEAVE_TYPE_LABELS[vbar.vacation.leave_type] ?? vbar.vacation.leave_type;
          return (
            <div
              key={`vac-${i}`}
              role="button"
              tabIndex={0}
              className="absolute top-1 flex cursor-pointer items-center overflow-hidden rounded bg-slate-400/80 text-xs text-white shadow-sm select-none dark:bg-slate-500/80"
              style={{
                top: vbar.row * 32 + 2 + utilRowHeight,
                left: vbar.left,
                width: Math.max(vbar.width, 20),
                height: 28,
              }}
              title={label}
              onClick={() => onVacationClick(vbar.vacation)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onVacationClick(vbar.vacation);
                }
              }}
            >
              {/* Striped accent on left edge */}
              <div
                className="h-full w-1.5 flex-shrink-0"
                style={{
                  backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)",
                }}
              />
              <span className="truncate px-1.5 font-medium">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
