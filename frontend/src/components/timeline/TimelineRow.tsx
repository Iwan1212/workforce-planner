import { useDroppable } from "@dnd-kit/core";
import {
  startOfMonth,
  endOfMonth,
  differenceInCalendarDays,
  format,
} from "date-fns";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { TimelineRowProps, DateRange } from "@/types/timeline";
import {
  LEAVE_TYPE_LABELS,
  getUtilColor,
  TIMELINE_LEFT_PANEL_WIDTH,
} from "@/lib/constants";
import { formatCapacity } from "@/lib/capacity";
import {
  getDateFromMonthlyPixelPosition,
  computeBarPositionMonthly,
  computeBarPositionWeekly,
  getResizeHandleVisibility,
  assignRow,
} from "@/lib/timelineLayout";
import { TimelineBar } from "./TimelineBar";
import { MONTH_WIDTH, DAY_WIDTH } from "./TimelineHeader";


export function TimelineRow({
  employeeId,
  name,
  team,
  capacity,
  assignments,
  vacations = [],
  occupancy,
  months,
  weeks,
  allDays,
  viewMode,
  holidayMap,
  isPlaceholderRow = false,
  collapsed = false,
  onToggleCollapse,
  onAssignmentClick,
  onVacationClick,
  onEmptyClick,
  onResizeEnd,
  onBarContextMenu,
  isOdd,
  readOnly = false,
}: TimelineRowProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `employee-${employeeId}`,
    data: { employeeId },
  });

  const showBars = !isPlaceholderRow || !collapsed;

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
  const barRowHeight = 32;
  // Placeholder row has no per-period occupancy strip, so instead of the wide
  // top offset used by employee rows it gets a symmetric 8px top/bottom padding
  // (same as project rows): 8px top + 28px bar + 8px bottom = maxRows*32 + 12,
  // constant regardless of how many bars stack.
  const barTopBase = isPlaceholderRow ? 8 : utilRowHeight;
  const rowHeight = isPlaceholderRow
    ? collapsed
      ? 44
      : Math.max(44, maxRows * barRowHeight + 12)
    : Math.max(38, maxRows * barRowHeight + 6 + utilRowHeight);

  const totalWidth = isWeekly
    ? allDays.length * DAY_WIDTH
    : months.length * MONTH_WIDTH;

  const occupancyPeriods = isWeekly
    ? weeks.map((w) => {
        const key = `w-${w.days[0]?.key.slice(0, 4)}-${w.weekNumber}`;
        const o = occupancy[key];
        return {
          key,
          width: w.days.length * DAY_WIDTH,
          pct: o?.percentage ?? 0,
          hours: o?.hours ?? 0,
          available: o?.available_hours ?? 0,
        };
      })
    : months.map((m) => {
        const o = occupancy[m.key];
        return {
          key: m.key,
          width: MONTH_WIDTH,
          pct: o?.percentage ?? 0,
          hours: o?.hours ?? 0,
          available: o?.available_hours ?? 0,
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

  return (
    <div
      className={`flex border-b ${isOdd ? "bg-muted/20" : ""} ${
        isOver ? "ring-2 ring-inset ring-primary/50" : ""
      }`}
      style={{ minWidth: TIMELINE_LEFT_PANEL_WIDTH + totalWidth }}
    >
      {/* Sticky left panel */}
      {isPlaceholderRow ? (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r bg-background px-3 py-2 text-left hover:bg-muted/50"
          style={{ width: TIMELINE_LEFT_PANEL_WIDTH, minHeight: rowHeight }}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {name}
          </span>
          <Badge variant="secondary" className="shrink-0 text-[10px]">
            {assignments.length}
          </Badge>
        </button>
      ) : (
        <div
          className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r bg-background px-3 py-2"
          style={{ width: TIMELINE_LEFT_PANEL_WIDTH, minHeight: rowHeight }}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              {team && (
                <Badge variant="secondary" className="text-[10px]">
                  {team}
                </Badge>
              )}
              {/* Only for part-timers: the percentages in this row are shares
                  of their shorter day, which is worth saying out loud. */}
              {capacity && !capacity.is_full_time && (
                <Badge
                  className="text-[10px]"
                  title="Wymiar etatu. Obłożenie liczy się względem tej wartości."
                >
                  {formatCapacity(capacity)}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline area */}
      <div
        ref={setNodeRef}
        className="relative flex-1"
        style={{
          minWidth: totalWidth,
          minHeight: rowHeight,
        }}
      >
        {/* Per-period occupancy indicators (not shown for the placeholder row) */}
        {!isPlaceholderRow && (
        <div
          className="absolute top-0 left-0 z-1 flex bg-transparent"
          style={{ height: utilRowHeight }}
        >
          {occupancyPeriods.map((p) => (
            <div
              key={p.key}
              className={`flex items-center justify-center bg-transparent text-[10px] ${getUtilColor(p.pct)}`}
              style={{ width: p.width }}
            >
              {p.available === 0
                ? "—"
                : `${Math.round(p.hours)}/${Math.round(p.available)}h · ${Math.round(p.pct)}%`}
            </div>
          ))}
        </div>
        )}

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
        {showBars &&
          bars.map((bar) => {
          const resizeVis = getResizeHandleVisibility(
            bar.assignment,
            isWeekly,
            months,
            allDays,
          );
          return (
            <div
              key={bar.assignment.id}
              className="absolute"
              style={{
                top: bar.row * barRowHeight + 2 + barTopBase,
              }}
            >
              <TimelineBar
                assignment={bar.assignment}
                employeeId={employeeId}
                left={bar.left}
                width={bar.width}
                barStartDate={format(bar.visibleStart, "yyyy-MM-dd")}
                onClick={() => onAssignmentClick(bar.assignment)}
                onResizeEnd={onResizeEnd}
                onBarContextMenu={(x, y, splitDate, splitDateIsValid) =>
                  onBarContextMenu(
                    bar.assignment.id,
                    x,
                    y,
                    splitDate,
                    splitDateIsValid,
                  )
                }
                splitDateFromRelX={
                  isWeekly
                    ? undefined
                    : (relX) =>
                        format(
                          getDateFromMonthlyPixelPosition(
                            bar.left + relX,
                            months,
                          ),
                          "yyyy-MM-dd",
                        )
                }
                pxPerDay={pxPerDay}
                showDailyHours={isWeekly}
                showResizeDateTooltip={!isWeekly}
                readOnly={readOnly}
                showResizeLeft={resizeVis.showResizeLeft}
                showResizeRight={resizeVis.showResizeRight}
                isPlaceholder={isPlaceholderRow}
              />
            </div>
          );
        })}

        {/* Vacation bars */}
        {showBars &&
          vacationBars.map((vbar, i) => {
          const label =
            LEAVE_TYPE_LABELS[vbar.vacation.leave_type] ??
            vbar.vacation.leave_type;
          return (
            <div
              key={`vac-${i}`}
              role="button"
              tabIndex={0}
              className="absolute flex cursor-pointer items-center overflow-hidden rounded bg-slate-400/80 text-xs text-white shadow-sm select-none dark:bg-slate-500/80"
              style={{
                top: vbar.row * barRowHeight + 2 + barTopBase,
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
                className="h-full w-1.5 shrink-0"
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
