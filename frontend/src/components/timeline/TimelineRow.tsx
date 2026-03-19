import { useDroppable } from "@dnd-kit/core";
import {
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  parseISO,
  max as dateMax,
  min as dateMin,
  isWithinInterval,
  addDays,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { TimelineAssignment, VacationInfo } from "@/types/assignment";
import type {
  TimelineRowProps,
  MonthDef,
  DateRange,
  DayInfo,
  WeekInfo,
} from "@/types/timeline";
import { TEAM_LABELS, LEAVE_TYPE_LABELS, getUtilColor } from "@/lib/constants";
import { TimelineBar } from "./TimelineBar";
import { MONTH_WIDTH, DAY_WIDTH } from "./TimelineHeader";

function getMonthlyPixelPosition(date: Date, months: MonthDef[]): number {
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

  const visibleStart = dateMax([aStart, firstMonthStart]);
  const visibleEnd = dateMin([aEnd, lastMonthEnd]);

  const left = getMonthlyPixelPosition(visibleStart, months);
  const right = getMonthlyPixelPosition(addDays(visibleEnd, 1), months);

  return {
    left,
    width: right - left,
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

  if (workingDays === 0) return 0;
  const availableHours = workingDays * 8;
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
    return pos
      ? [{ assignment, ...pos, row: assignRow(pos, occupiedRows) }]
      : [];
  });

  const vacationBars = vacations.flatMap((vacation) => {
    const pos = computePos(vacation);
    return pos ? [{ vacation, ...pos, row: assignRow(pos, occupiedRows) }] : [];
  });

  const allBars = [...bars, ...vacationBars];
  const maxRows =
    allBars.length > 0 ? Math.max(...allBars.map((b) => b.row)) + 1 : 1;
  const utilRowHeight = 18;
  const assignmentBarRowHeight = 32;
  const vacationBarRowHeight = 36;
  const rowHeight = Math.max(
    38,
    maxRows * Math.max(assignmentBarRowHeight, vacationBarRowHeight) +
      6 +
      utilRowHeight,
  );

  const totalWidth = isWeekly
    ? allDays.length * DAY_WIDTH
    : months.length * MONTH_WIDTH;

  const utilizationPeriods = isWeekly
    ? weeks.map((w) => ({
        key: `w-${w.days[0]?.key.slice(0, 4)}-${w.weekNumber}`,
        width: w.days.length * DAY_WIDTH,
        pct: computeWeeklyUtilization(w, assignments, vacations, holidayMap),
      }))
    : months.map((m) => {
        const u = utilization[m.key];
        return {
          key: m.key,
          width: MONTH_WIDTH,
          pct: u ? Math.round(u.percentage) : 0,
        };
      });

  const separatorColumns = isWeekly
    ? allDays.map((day, i) => ({
        key: day.key,
        left: i * DAY_WIDTH,
        width: DAY_WIDTH,
        clickKey: day.key,
        extraClassName:
          day.isWeekend || !!holidayMap[day.key] ? "bg-muted/40" : "",
        title: holidayMap[day.key],
      }))
    : months.map((m, i) => ({
        key: m.key,
        left: i * MONTH_WIDTH,
        width: MONTH_WIDTH,
        clickKey: m.key,
        extraClassName: "",
        title: undefined as string | undefined,
      }));

  const LEFT_PANEL_WIDTH = 250;

  return (
    <div
      className={`flex border-b ${isOdd ? "bg-muted/20" : ""} ${
        isOver ? "ring-2 ring-inset ring-primary/50" : ""
      }`}
      style={{ minWidth: LEFT_PANEL_WIDTH + totalWidth }}
    >
      {/* Sticky left panel */}
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r bg-background px-3 py-2"
        style={{ width: LEFT_PANEL_WIDTH, minHeight: rowHeight }}
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
          className="absolute top-0 left-0 z-1 flex bg-transparent"
          style={{ height: utilRowHeight }}
        >
          {utilizationPeriods.map((p) => (
            <div
              key={p.key}
              className={`flex items-center justify-center bg-transparent text-[10px] ${getUtilColor(p.pct)}`}
              style={{ width: p.width }}
            >
              {p.pct}%
            </div>
          ))}
        </div>

        {/* Separators */}
        {separatorColumns.map((col) => (
          <div
            key={col.key}
            role={readOnly ? undefined : "button"}
            tabIndex={readOnly ? undefined : 0}
            aria-label={readOnly ? undefined : `Dodaj assignment ${col.key}`}
            className={`absolute border-r border-dashed border-muted-foreground/20 ${readOnly ? "" : "cursor-pointer"} ${col.extraClassName}`}
            style={{
              left: col.left,
              width: col.width,
              top: 0,
              height: "100%",
            }}
            title={col.title}
            onClick={
              readOnly
                ? undefined
                : () => onEmptyClick(employeeId, col.clickKey)
            }
            onKeyDown={
              readOnly
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEmptyClick(employeeId, col.clickKey);
                    }
                  }
            }
          />
        ))}

        {/* Assignment bars */}
        {bars.map((bar) => (
          <div
            key={bar.assignment.id}
            className="absolute"
            style={{
              top: bar.row * assignmentBarRowHeight + 2 + utilRowHeight,
            }}
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
          const label =
            LEAVE_TYPE_LABELS[vbar.vacation.leave_type] ??
            vbar.vacation.leave_type;
          return (
            <div
              key={`vac-${i}`}
              role="button"
              tabIndex={0}
              className="absolute top-1 flex cursor-pointer items-center overflow-hidden rounded bg-slate-400/80 text-xs text-white shadow-sm select-none dark:bg-slate-500/80"
              style={{
                top: vbar.row * vacationBarRowHeight + 2 + utilRowHeight,
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
                  backgroundImage:
                    "repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)",
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
