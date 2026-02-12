import { useDroppable } from "@dnd-kit/core";
import {
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  parseISO,
  max as dateMax,
  min as dateMin,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { TimelineAssignment, MonthUtilization } from "@/api/assignments";
import type { DayInfo } from "@/hooks/useTimeline";
import type { ViewMode } from "@/stores/timelineStore";
import { TimelineBar } from "./TimelineBar";
import { UtilizationBadge } from "./UtilizationBadge";
import { MONTH_WIDTH, DAY_WIDTH } from "./TimelineHeader";

const TEAM_LABELS: Record<string, string> = {
  PM: "PM",
  QA: "QA",
  Frontend: "Frontend",
  Backend: "Backend",
  Mobile: "Mobile",
  UX_UI_Designer: "UX/UI",
  DevOps: "DevOps",
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
  utilization: Record<string, MonthUtilization>;
  months: MonthDef[];
  allDays: DayInfo[];
  viewMode: ViewMode;
  onAssignmentClick: (assignment: TimelineAssignment) => void;
  onEmptyClick: (employeeId: number, monthKey: string) => void;
  onResizeEnd: (
    assignmentId: number,
    edge: "left" | "right",
    deltaPx: number
  ) => void;
  holidayMap: Record<string, string>;
  isOdd: boolean;
}

function computeBarPositionMonthly(
  assignment: TimelineAssignment,
  months: MonthDef[]
): { left: number; width: number } | null {
  if (months.length === 0) return null;

  const aStart = parseISO(assignment.start_date);
  const aEnd = parseISO(assignment.end_date);

  const firstMonthStart = startOfMonth(
    new Date(months[0].year, months[0].month - 1, 1)
  );
  const lastMonth = months[months.length - 1];
  const lastMonthEnd = endOfMonth(
    new Date(lastMonth.year, lastMonth.month - 1, 1)
  );

  if (aEnd < firstMonthStart || aStart > lastMonthEnd) return null;

  const totalDays =
    differenceInCalendarDays(lastMonthEnd, firstMonthStart) + 1;
  const totalWidth = months.length * MONTH_WIDTH;

  const visibleStart = dateMax([aStart, firstMonthStart]);
  const visibleEnd = dateMin([aEnd, lastMonthEnd]);

  const leftDays = differenceInCalendarDays(visibleStart, firstMonthStart);
  const spanDays = differenceInCalendarDays(visibleEnd, visibleStart) + 1;

  const left = (leftDays / totalDays) * totalWidth;
  const width = (spanDays / totalDays) * totalWidth;

  return { left, width };
}

function computeBarPositionWeekly(
  assignment: TimelineAssignment,
  allDays: DayInfo[]
): { left: number; width: number } | null {
  if (allDays.length === 0) return null;

  const aStart = parseISO(assignment.start_date);
  const aEnd = parseISO(assignment.end_date);

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

export function TimelineRow({
  employeeId,
  name,
  team,
  assignments,
  utilization,
  months,
  allDays,
  viewMode,
  holidayMap,
  onAssignmentClick,
  onEmptyClick,
  onResizeEnd,
  isOdd,
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
      new Date(months[0].year, months[0].month - 1, 1)
    );
    const lastMonth = months[months.length - 1];
    const lastMonthEnd = endOfMonth(
      new Date(lastMonth.year, lastMonth.month - 1, 1)
    );
    const totalDays =
      differenceInCalendarDays(lastMonthEnd, firstMonthStart) + 1;
    const totalWidth = months.length * MONTH_WIDTH;
    pxPerDay = totalDays > 0 ? totalWidth / totalDays : 1;
  }

  // Compute overlapping assignments to stack them
  const bars: {
    assignment: TimelineAssignment;
    left: number;
    width: number;
    row: number;
  }[] = [];

  const occupiedRows: { left: number; right: number; row: number }[] = [];

  for (const a of assignments) {
    const pos = isWeekly
      ? computeBarPositionWeekly(a, allDays)
      : computeBarPositionMonthly(a, months);
    if (!pos) continue;

    let row = 0;
    while (
      occupiedRows.some(
        (o) =>
          o.row === row &&
          pos.left < o.right &&
          pos.left + pos.width > o.left
      )
    ) {
      row++;
    }

    occupiedRows.push({ left: pos.left, right: pos.left + pos.width, row });
    bars.push({ assignment: a, ...pos, row });
  }

  const maxRows =
    bars.length > 0 ? Math.max(...bars.map((b) => b.row)) + 1 : 1;
  const rowHeight = Math.max(38, maxRows * 32 + 6);

  const totalWidth = isWeekly
    ? allDays.length * DAY_WIDTH
    : months.length * MONTH_WIDTH;

  const visibleUtils = months
    .map((m) => utilization[m.key])
    .filter(Boolean);
  const avgPct =
    visibleUtils.length > 0
      ? Math.round(
          visibleUtils.reduce((sum, u) => sum + u.percentage, 0) /
            visibleUtils.length
        )
      : 0;
  const anyOverbooked = visibleUtils.some((u) => u.is_overbooked);

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
        <UtilizationBadge percentage={avgPct} isOverbooked={anyOverbooked} />
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
        {/* Separators */}
        {isWeekly
          ? allDays.map((day, i) => {
              const isHoliday = !!holidayMap[day.key];
              return (
                <div
                  key={day.key}
                  className={`absolute top-0 h-full border-r border-dashed border-muted-foreground/20 cursor-pointer ${
                    day.isWeekend || isHoliday ? "bg-muted/40" : ""
                  }`}
                  style={{ left: i * DAY_WIDTH, width: DAY_WIDTH }}
                  title={holidayMap[day.key]}
                  onClick={() =>
                    onEmptyClick(employeeId, day.key.slice(0, 7))
                  }
                />
              );
            })
          : months.map((m, i) => (
              <div
                key={m.key}
                className="absolute top-0 h-full border-r border-dashed border-muted-foreground/20 cursor-pointer"
                style={{ left: i * MONTH_WIDTH, width: MONTH_WIDTH }}
                onClick={() => onEmptyClick(employeeId, m.key)}
              />
            ))}

        {/* Assignment bars */}
        {bars.map((bar) => (
          <div
            key={bar.assignment.id}
            className="absolute"
            style={{ top: bar.row * 32 + 2 }}
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
            />
          </div>
        ))}
      </div>
    </div>
  );
}
