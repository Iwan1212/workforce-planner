import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { addDays, parseISO, format, getDay } from "date-fns";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTimeline } from "@/hooks/useTimeline";
import { useTimelineStore } from "@/stores/timelineStore";
import { useAuthStore } from "@/stores/authStore";
import { TimelineFilters } from "./TimelineFilters";
import { TimelineHeader, MONTH_WIDTH, DAY_WIDTH } from "./TimelineHeader";
import { TimelineRow } from "./TimelineRow";
import { AssignmentModal } from "@/components/assignments/AssignmentModal";
import {
  updateAssignment,
  type TimelineAssignment,
} from "@/api/assignments";

interface VacationRange {
  start_date: string;
  end_date: string;
}

function calcUtilizationInRange(
  assignments: TimelineAssignment[],
  vacations: VacationRange[],
  holidayMap: Record<string, string>,
  dateFrom: string | null,
  dateTo: string | null,
  visibleStart: Date,
  visibleEnd: Date,
): number {
  const rangeStart = dateFrom ? parseISO(dateFrom) : visibleStart;
  const rangeEnd = dateTo ? parseISO(dateTo) : visibleEnd;

  let totalHours = 0;
  let workingDays = 0;
  let vacationDays = 0;

  let current = rangeStart;
  while (current <= rangeEnd) {
    const dow = getDay(current); // 0=Sun, 6=Sat
    const dateKey = format(current, "yyyy-MM-dd");
    if (dow !== 0 && dow !== 6 && !holidayMap[dateKey]) {
      workingDays++;

      const isOnVacation = vacations.some((v) => {
        const vStart = parseISO(v.start_date);
        const vEnd = parseISO(v.end_date);
        return current >= vStart && current <= vEnd;
      });

      if (isOnVacation) {
        vacationDays++;
      } else {
        for (const a of assignments) {
          const aStart = parseISO(a.start_date);
          const aEnd = parseISO(a.end_date);
          if (current >= aStart && current <= aEnd) {
            totalHours += a.daily_hours;
          }
        }
      }
    }
    current = addDays(current, 1);
  }

  const effectiveWorkingDays = workingDays - vacationDays;
  if (effectiveWorkingDays === 0) return 0;
  return Math.round((totalHours / (effectiveWorkingDays * 8)) * 100);
}

export function Timeline() {
  const queryClient = useQueryClient();
  const { data, isLoading, months, weeks, allDays, viewMode, startDate, endDate } = useTimeline();
  const searchQuery = useTimelineStore((s) => s.searchQuery);
  const utilizationFilter = useTimelineStore((s) => s.utilizationFilter);
  const currentUser = useAuthStore((s) => s.user);
  const isViewer = currentUser?.role === "viewer";

  // Build holiday lookup: date string -> holiday name
  const holidayMap: Record<string, string> = {};
  if (data?.holidays) {
    for (const h of data.holidays) {
      holidayMap[h.date] = h.name;
    }
  }

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<TimelineAssignment | null>(null);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<number | null>(
    null
  );
  const [defaultStartDate, setDefaultStartDate] = useState<string | null>(null);

  // Sync horizontal scroll between header and body
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const handleBodyScroll = useCallback(() => {
    if (headerScrollRef.current && bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft;
    }
  }, []);

  // D&D sensor with activation distance to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Mutation for D&D and resize
  const patchMutation = useMutation({
    mutationFn: ({
      id,
      data: patchData,
    }: {
      id: number;
      data: Record<string, unknown>;
    }) => updateAssignment(id, patchData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // D&D handler — move assignment to different employee
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const dragData = active.data.current as {
        assignment: TimelineAssignment;
        employeeId: number;
      };
      const dropData = over.data.current as { employeeId: number };

      if (!dragData || !dropData) return;
      if (dragData.employeeId === dropData.employeeId) return;

      patchMutation.mutate(
        {
          id: dragData.assignment.id,
          data: { employee_id: dropData.employeeId },
        },
        {
          onSuccess: () => {
            const targetName =
              data?.employees.find((e) => e.id === dropData.employeeId)?.name ??
              "innego pracownika";
            toast.success(`Assignment przeniesiony na ${targetName}`);
          },
        }
      );
    },
    [patchMutation, data]
  );

  // Resize handler — change start or end date
  const handleResizeEnd = useCallback(
    (assignmentId: number, edge: "left" | "right", deltaPx: number) => {
      if (!data) return;

      // Find the assignment in data
      let assignment: TimelineAssignment | undefined;
      for (const emp of data.employees) {
        assignment = emp.assignments.find((a) => a.id === assignmentId);
        if (assignment) break;
      }
      if (!assignment) return;

      let pxPerDay: number;
      if (viewMode === "weekly") {
        pxPerDay = DAY_WIDTH;
      } else {
        const totalWidth = months.length * MONTH_WIDTH;
        const firstMonth = months[0];
        const lastMonth = months[months.length - 1];
        const firstDate = new Date(firstMonth.year, firstMonth.month - 1, 1);
        const lastDate = new Date(lastMonth.year, lastMonth.month, 0);
        const totalDays =
          Math.round(
            (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;
        pxPerDay = totalWidth / totalDays;
      }

      const daysDelta = Math.round(deltaPx / pxPerDay);
      if (daysDelta === 0) return;

      const patchData: Record<string, string> = {};
      if (edge === "left") {
        const newStart = addDays(parseISO(assignment.start_date), daysDelta);
        patchData.start_date = format(newStart, "yyyy-MM-dd");
      } else {
        const newEnd = addDays(parseISO(assignment.end_date), daysDelta);
        patchData.end_date = format(newEnd, "yyyy-MM-dd");
      }

      patchMutation.mutate(
        { id: assignmentId, data: patchData },
        {
          onSuccess: () => toast.success("Daty zaktualizowane"),
        }
      );
    },
    [data, months, viewMode, patchMutation]
  );

  const handleAssignmentClick = (
    assignment: TimelineAssignment,
    employeeId: number
  ) => {
    setEditingAssignment(assignment);
    setDefaultEmployeeId(employeeId);
    setModalOpen(true);
  };

  const handleEmptyClick = (employeeId: number, monthKey: string) => {
    setEditingAssignment(null);
    setDefaultEmployeeId(employeeId);
    setDefaultStartDate(`${monthKey}-01`);
    setModalOpen(true);
  };

  const handleNewAssignment = () => {
    setEditingAssignment(null);
    setDefaultEmployeeId(null);
    setDefaultStartDate(null);
    setModalOpen(true);
  };

  const displayedEmployees = useMemo(() => {
    const employees = data?.employees ?? [];
    if (!utilizationFilter) return employees;
    const { dateFrom, dateTo, minPct, maxPct } = utilizationFilter;
    if (minPct === null && maxPct === null) return employees;
    const hMap: Record<string, string> = {};
    if (data?.holidays) {
      for (const h of data.holidays) hMap[h.date] = h.name;
    }
    return employees.filter((emp) => {
      const pct = calcUtilizationInRange(emp.assignments, emp.vacations ?? [], hMap, dateFrom, dateTo, startDate, endDate);
      if (minPct !== null && pct < minPct) return false;
      if (maxPct !== null && pct > maxPct) return false;
      return true;
    });
  }, [data, utilizationFilter, startDate, endDate]);

  const monthDefs = months.map((m) => ({
    key: m.key,
    year: m.year,
    month: m.month,
  }));

  const hasEmployees = !isLoading && data && data.employees.length > 0;

  return (
    <div>
      {/* Sticky top section — <main> has no padding so sticky top-0 works flush. */}
      <div className="sticky top-0 z-30 bg-background px-6 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Timeline</h2>
          {!isViewer && (
            <Button onClick={handleNewAssignment}>
              <Plus className="mr-2 h-4 w-4" />
              Nowy assignment
            </Button>
          )}
        </div>

        <TimelineFilters />

        {hasEmployees && (
          <div className="rounded-t-md border bg-muted shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            <div className="flex">
              <div className="flex w-[250px] flex-shrink-0 items-center border-r bg-muted px-3 py-2">
                <span className="text-sm font-medium">Pracownik</span>
              </div>
              <div
                ref={headerScrollRef}
                className="flex-1 overflow-hidden"
              >
                <TimelineHeader
                  viewMode={viewMode}
                  months={months}
                  workingDaysPerMonth={data.working_days_per_month}
                  weeks={weeks}
                  allDays={allDays}
                  holidayMap={holidayMap}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Body content */}
      {isLoading ? (
        <div className="mx-6 rounded-md border">
          <div className="flex border-b">
            <div className="w-[250px] flex-shrink-0 border-r p-3">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[200px] flex-shrink-0 border-r p-3"
                >
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-1 h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex border-b">
              <div className="w-[250px] flex-shrink-0 border-r p-3">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="mt-1 h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex-1 p-3">
                <div
                  className="h-7 animate-pulse rounded bg-muted"
                  style={{ width: `${120 + i * 40}px` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : !data || data.employees.length === 0 ? (
        <div className="mx-6 flex h-64 items-center justify-center">
          <p className="text-muted-foreground">
            Brak pracowników do wyświetlenia. Dodaj pracowników i assignmenty.
          </p>
        </div>
      ) : data.employees.length === 0 && searchQuery.trim() ? (
        <div className="mx-6 flex h-64 items-center justify-center">
          <p className="text-muted-foreground">
            Brak wyników dla &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="mx-6 rounded-b-md border-x border-b">
            <div
              ref={bodyScrollRef}
              className="overflow-x-auto"
              onScroll={handleBodyScroll}
            >
              {displayedEmployees.map((emp, idx) => (
                <TimelineRow
                  key={emp.id}
                  employeeId={emp.id}
                  name={emp.name}
                  team={emp.team}
                  assignments={emp.assignments}
                  utilization={emp.utilization}
                  months={monthDefs}
                  weeks={weeks}
                  allDays={allDays}
                  viewMode={viewMode}
                  holidayMap={holidayMap}
                  onAssignmentClick={isViewer ? () => {} : (a) => handleAssignmentClick(a, emp.id)}
                  onEmptyClick={isViewer ? () => {} : handleEmptyClick}
                  onResizeEnd={isViewer ? () => {} : handleResizeEnd}
                  readOnly={isViewer}
                  isOdd={idx % 2 === 1}
                />
              ))}
            </div>
          </div>
        </DndContext>
      )}

      <div className="pb-6" />
      <AssignmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAssignment(null);
        }}
        assignment={editingAssignment}
        defaultEmployeeId={defaultEmployeeId}
        defaultStartDate={defaultStartDate}
      />
    </div>
  );
}
