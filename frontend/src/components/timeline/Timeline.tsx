import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { addDays, parseISO, format, getDay } from "date-fns";
import { pl } from "date-fns/locale";
import { Copy, Plus, Scissors } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { useTimeline } from "@/hooks/useTimeline";
import { useTimelineStore } from "@/stores/timelineStore";
import { useAuthStore } from "@/stores/authStore";
import { TimelineFilters } from "./TimelineFilters";
import { TimelineHeader, MONTH_WIDTH, DAY_WIDTH } from "./TimelineHeader";
import { TimelineRow } from "./TimelineRow";
import { AssignmentModal } from "@/components/assignments/AssignmentModal";
import {
  updateAssignment,
  splitAssignment,
  duplicateAssignment,
} from "@/api/assignments";
import type { TimelineAssignment, VacationInfo } from "@/types/assignment";
import { triggerVacationSync } from "@/api/settings";
import { VacationDialog } from "./VacationDialog";
import { TimelineEmptyState } from "./TimelineEmptyState";
import type { VacationRange } from "@/types/timeline";
import { TIMELINE_LEFT_PANEL_WIDTH } from "@/lib/constants";

type TimelineProps = {
  onNavigate?: (path: string) => void;
};

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

      if (!isOnVacation) {
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

  if (workingDays === 0) return 0;
  return Math.round((totalHours / (workingDays * 8)) * 100);
}

export function Timeline({ onNavigate }: TimelineProps = {}) {
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    months,
    weeks,
    allDays,
    viewMode,
    startDate,
    endDate,
  } = useTimeline();
  const searchQuery = useTimelineStore((s) => s.searchQuery);
  const utilizationFilter = useTimelineStore((s) => s.utilizationFilter);
  const currentUser = useAuthStore((s) => s.user);
  const isViewer = currentUser?.role === "viewer";
  const isAdmin = currentUser?.role === "admin";

  const holidayMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (data?.holidays) {
      for (const h of data.holidays) map[h.date] = h.name;
    }
    return map;
  }, [data?.holidays]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<TimelineAssignment | null>(null);
  const [defaultEmployeeId, setDefaultEmployeeId] = useState<number | null>(
    null,
  );
  const [defaultStartDate, setDefaultStartDate] = useState<string | null>(null);
  const [vacationModalOpen, setVacationModalOpen] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<VacationInfo | null>(
    null,
  );

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    splitDate: string;
    splitDateLabel: string;
    splitDateIsValid: boolean;
    assignmentId: number;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [timelineGridMaxHeight, setTimelineGridMaxHeight] = useState<
    string | undefined
  >("min(80dvh, calc(100dvh - 12rem))");

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const update = () => {
      const h = Math.round(toolbar.getBoundingClientRect().height);
      setTimelineGridMaxHeight(`calc(100dvh - ${h}px - 2.5rem)`);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(toolbar);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [contextMenu]);

  const totalWidth =
    viewMode === "weekly"
      ? allDays.length * DAY_WIDTH
      : months.length * MONTH_WIDTH;

  // D&D sensor with activation distance to avoid accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Vacation sync mutation
  const syncVacationsMutation = useMutation({
    mutationFn: triggerVacationSync,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success(`Zsynchronizowano ${result.synced} urlopów`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Split mutation
  const splitMutation = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string }) =>
      splitAssignment(id, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Assignment podzielony");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: number) => duplicateAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Assignment zduplikowany");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleBarContextMenu = useCallback(
    (
      assignmentId: number,
      x: number,
      y: number,
      splitDate: string,
      splitDateIsValid: boolean,
    ) => {
      setContextMenu({
        x,
        y,
        splitDate,
        splitDateLabel: format(parseISO(splitDate), "d.MM.yyyy", {
          locale: pl,
        }),
        splitDateIsValid,
        assignmentId,
      });
      // Close assignment modal if open
      setModalOpen(false);
      setEditingAssignment(null);
    },
    [],
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
        },
      );
    },
    [patchMutation, data],
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
            (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
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
        },
      );
    },
    [data, months, viewMode, patchMutation],
  );

  const handleAssignmentClick = (
    assignment: TimelineAssignment,
    employeeId: number,
  ) => {
    setEditingAssignment(assignment);
    setDefaultEmployeeId(employeeId);
    setModalOpen(true);
  };

  const handleEmptyClick = (employeeId: number, dateKey: string) => {
    setEditingAssignment(null);
    setDefaultEmployeeId(employeeId);
    setDefaultStartDate(dateKey.length === 10 ? dateKey : `${dateKey}-01`);
    setModalOpen(true);
  };

  const handleVacationClick = (vacation: VacationInfo) => {
    setSelectedVacation(vacation);
    setVacationModalOpen(true);
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
    return employees.filter((emp) => {
      const pct = calcUtilizationInRange(
        emp.assignments,
        emp.vacations ?? [],
        holidayMap,
        dateFrom,
        dateTo,
        startDate,
        endDate,
      );
      if (minPct !== null && pct < minPct) return false;
      if (maxPct !== null && pct > maxPct) return false;
      return true;
    });
  }, [data, utilizationFilter, startDate, endDate, holidayMap]);

  return (
    <div>
      {/* Sticky top section — <main> has no padding so sticky top-0 works flush. */}
      <div
        ref={toolbarRef}
        className="sticky top-0 z-30 bg-background px-6 pt-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Timeline</h2>
          <div className="flex items-center gap-2">
            {isAdmin && data?.vacation_sync_status?.is_configured && (
              <div className="flex items-center gap-2">
                {data.vacation_sync_status.last_synced_at && (
                  <span className="text-xs text-muted-foreground">
                    Sync:{" "}
                    {new Date(
                      data.vacation_sync_status.last_synced_at,
                    ).toLocaleString("pl-PL")}
                  </span>
                )}
                <RefreshButton
                  label="Sync urlopów"
                  onClick={() => syncVacationsMutation.mutate()}
                  isPending={syncVacationsMutation.isPending}
                />
              </div>
            )}
            {!isViewer && (
              <Button onClick={handleNewAssignment}>
                <Plus className="mr-2 h-4 w-4" />
                Dodaj assignment
              </Button>
            )}
          </div>
        </div>

        <TimelineFilters />
      </div>

      {/* Body content */}
      {isLoading ? (
        <div className="mx-6 rounded-md border">
          <div className="flex border-b">
            <div
              className="shrink-0 border-r p-3"
              style={{ width: TIMELINE_LEFT_PANEL_WIDTH }}
            >
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex flex-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="w-[200px] shrink-0 border-r p-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="mt-1 h-3 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex border-b">
              <div
                className="shrink-0 border-r p-3"
                style={{ width: TIMELINE_LEFT_PANEL_WIDTH }}
              >
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
        <TimelineEmptyState
          searchQuery={searchQuery}
          isViewer={isViewer}
          onNavigateToEmployees={() => onNavigate?.("/employees")}
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="mx-6 rounded-md border bg-background shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            <div
              className="overflow-auto"
              style={{ maxHeight: timelineGridMaxHeight }}
            >
              <div style={{ minWidth: TIMELINE_LEFT_PANEL_WIDTH + totalWidth }}>
                <div
                  className="sticky top-0 z-20 flex border-b bg-muted shadow-sm"
                  style={{ minWidth: TIMELINE_LEFT_PANEL_WIDTH + totalWidth }}
                >
                  <div
                    className="sticky left-0 z-30 flex shrink-0 items-center border-r bg-muted px-3 py-2"
                    style={{ width: TIMELINE_LEFT_PANEL_WIDTH }}
                  >
                    <span className="text-sm font-medium">Pracownik</span>
                  </div>
                  <div
                    className="flex shrink-0"
                    style={{ minWidth: totalWidth }}
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
                {displayedEmployees.map((emp, idx) => (
                  <TimelineRow
                    key={emp.id}
                    employeeId={emp.id}
                    name={emp.name}
                    team={emp.team}
                    assignments={emp.assignments}
                    vacations={emp.vacations}
                    utilization={emp.utilization}
                    months={months}
                    weeks={weeks}
                    allDays={allDays}
                    viewMode={viewMode}
                    holidayMap={holidayMap}
                    onAssignmentClick={(a) => handleAssignmentClick(a, emp.id)}
                    onVacationClick={handleVacationClick}
                    onEmptyClick={handleEmptyClick}
                    onResizeEnd={handleResizeEnd}
                    onBarContextMenu={handleBarContextMenu}
                    readOnly={isViewer}
                    isOdd={idx % 2 === 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </DndContext>
      )}

      <div className="pb-6" />

      {/* Context menu for split / duplicate */}
      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="fixed z-[9999] min-w-44 overflow-hidden rounded-md border bg-popover py-1 shadow-md"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              top: Math.min(contextMenu.y, window.innerHeight - 100),
            }}
          >
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!contextMenu.splitDateIsValid}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                splitMutation.mutate({
                  id: contextMenu.assignmentId,
                  date: contextMenu.splitDate,
                });
                setContextMenu(null);
              }}
            >
              <Scissors size={13} className="shrink-0" />
              <span>Podziel: {contextMenu.splitDateLabel}</span>
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {
                duplicateMutation.mutate(contextMenu.assignmentId);
                setContextMenu(null);
              }}
            >
              <Copy size={13} className="shrink-0" />
              <span>Duplikuj</span>
            </button>
          </div>,
          document.body,
        )}

      <VacationDialog
        open={vacationModalOpen}
        onClose={() => {
          setVacationModalOpen(false);
          setSelectedVacation(null);
        }}
        vacation={selectedVacation}
        holidayMap={holidayMap}
      />
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
