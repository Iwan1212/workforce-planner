import { useDroppable } from "@dnd-kit/core";
import { startOfMonth, endOfMonth, differenceInCalendarDays, format } from "date-fns";
import type { ProjectTimelineAssignment, ProjectTimelineProject } from "@/types/project-timeline";
import type { TimelineAssignment } from "@/types/assignment";
import type { MonthDef, DateRange, DayInfo } from "@/types/timeline";
import { TimelineBar } from "@/components/timeline/TimelineBar";
import { MONTH_WIDTH, DAY_WIDTH } from "@/components/timeline/TimelineHeader";
import { TIMELINE_LEFT_PANEL_WIDTH } from "@/lib/constants";
import {
  getDateFromMonthlyPixelPosition,
  computeBarPositionMonthly,
  computeBarPositionWeekly,
  getResizeHandleVisibility,
  assignRow,
} from "@/lib/timelineLayout";

interface ProjectTimelineRowProps {
  project: ProjectTimelineProject;
  months: MonthDef[];
  allDays: DayInfo[];
  viewMode: "monthly" | "weekly";
  holidayMap: Record<string, string>;
  onAssignmentClick: (assignment: ProjectTimelineAssignment) => void;
  onEmptyClick: (projectId: number, dateKey: string) => void;
  onResizeEnd: (assignmentId: number, edge: "left" | "right", deltaPx: number) => void;
  onBarContextMenu: (
    assignmentId: number,
    x: number,
    y: number,
    splitDate: string,
    splitDateIsValid: boolean,
  ) => void;
  isOdd: boolean;
  readOnly?: boolean;
}

export function ProjectTimelineRow({
  project,
  months,
  allDays,
  viewMode,
  holidayMap,
  onAssignmentClick,
  onEmptyClick,
  onResizeEnd,
  onBarContextMenu,
  isOdd,
  readOnly = false,
}: ProjectTimelineRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `project-${project.id}`,
    data: { projectId: project.id },
  });

  const isWeekly = viewMode === "weekly";

  let pxPerDay = 1;
  if (isWeekly) {
    pxPerDay = DAY_WIDTH;
  } else if (months.length > 0) {
    const firstMonthStart = startOfMonth(new Date(months[0].year, months[0].month - 1, 1));
    const lastMonth = months[months.length - 1];
    const lastMonthEnd = endOfMonth(new Date(lastMonth.year, lastMonth.month - 1, 1));
    const totalDays = differenceInCalendarDays(lastMonthEnd, firstMonthStart) + 1;
    const totalWidth = months.length * MONTH_WIDTH;
    pxPerDay = totalDays > 0 ? totalWidth / totalDays : 1;
  }

  const occupiedRows: { left: number; right: number; row: number }[] = [];

  const computePos = (item: DateRange) =>
    isWeekly
      ? computeBarPositionWeekly(item, allDays)
      : computeBarPositionMonthly(item, months);

  // Adapt ProjectTimelineAssignment → TimelineAssignment for TimelineBar reuse
  const bars = project.assignments.flatMap((assignment) => {
    const pos = computePos(assignment);
    if (!pos) return [];
    const adapted: TimelineAssignment = {
      id: assignment.id,
      project_id: project.id,
      project_name: assignment.employee_name,
      project_color: project.color,
      start_date: assignment.start_date,
      end_date: assignment.end_date,
      allocation_type: assignment.allocation_type,
      allocation_value: assignment.allocation_value,
      note: assignment.note,
      is_tentative: assignment.is_tentative,
      daily_hours: assignment.daily_hours,
    };
    return [{ original: assignment, adapted, ...pos, row: assignRow(pos, occupiedRows) }];
  });

  const maxRows = bars.length > 0 ? Math.max(...bars.map((b) => b.row)) + 1 : 1;
  const barRowHeight = 32;
  const rowHeight = Math.max(38, maxRows * barRowHeight + 6);

  const totalWidth = isWeekly ? allDays.length * DAY_WIDTH : months.length * MONTH_WIDTH;

  const separatorColumns = isWeekly
    ? allDays.map((day, i) => ({
        key: day.key,
        left: i * DAY_WIDTH,
        width: DAY_WIDTH,
        clickKey: day.key,
        extraClassName: day.isWeekend || !!holidayMap[day.key] ? "bg-muted/40" : "",
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

  return (
    <div
      className={`flex border-b ${isOdd ? "bg-muted/20" : ""} ${
        isOver ? "ring-2 ring-inset ring-primary/50" : ""
      }`}
      style={{ minWidth: TIMELINE_LEFT_PANEL_WIDTH + totalWidth }}
    >
      {/* Sticky left panel */}
      <div
        className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r bg-background px-3 py-2"
        style={{ width: TIMELINE_LEFT_PANEL_WIDTH, minHeight: rowHeight }}
      >
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-sm"
          style={{ backgroundColor: project.color }}
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>
      </div>

      {/* Timeline area */}
      <div
        ref={setNodeRef}
        className="relative flex-1"
        style={{ minWidth: totalWidth, minHeight: rowHeight }}
      >
        {/* Separator columns */}
        {separatorColumns.map((col) => (
          <div
            key={col.key}
            role={readOnly ? undefined : "button"}
            tabIndex={readOnly ? undefined : 0}
            aria-label={readOnly ? undefined : `Dodaj assignment ${col.key}`}
            className={`absolute border-r border-dashed border-muted-foreground/20 ${
              readOnly ? "" : "cursor-pointer"
            } ${col.extraClassName}`}
            style={{ left: col.left, width: col.width, top: 0, height: "100%" }}
            title={col.title}
            onClick={readOnly ? undefined : () => onEmptyClick(project.id, col.clickKey)}
            onKeyDown={
              readOnly
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEmptyClick(project.id, col.clickKey);
                    }
                  }
            }
          />
        ))}

        {/* Assignment bars */}
        {bars.map((bar) => {
          const resizeVis = getResizeHandleVisibility(bar.adapted, isWeekly, months, allDays);
          return (
            <div
              key={bar.adapted.id}
              className="absolute"
              style={{ top: bar.row * barRowHeight + 2 }}
            >
              <TimelineBar
                assignment={bar.adapted}
                employeeId={project.id}
                left={bar.left}
                width={bar.width}
                barStartDate={format(bar.visibleStart, "yyyy-MM-dd")}
                onClick={() => onAssignmentClick(bar.original)}
                onResizeEnd={onResizeEnd}
                onBarContextMenu={(x, y, splitDate, splitDateIsValid) =>
                  onBarContextMenu(bar.adapted.id, x, y, splitDate, splitDateIsValid)
                }
                splitDateFromRelX={
                  isWeekly
                    ? undefined
                    : (relX) =>
                        format(
                          getDateFromMonthlyPixelPosition(bar.left + relX, months),
                          "yyyy-MM-dd",
                        )
                }
                pxPerDay={pxPerDay}
                showDailyHours={isWeekly}
                showResizeDateTooltip={!isWeekly}
                readOnly={readOnly}
                showResizeLeft={resizeVis.showResizeLeft}
                showResizeRight={resizeVis.showResizeRight}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
