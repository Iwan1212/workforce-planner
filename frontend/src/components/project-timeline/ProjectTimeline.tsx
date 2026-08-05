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
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { addDays, parseISO, format } from "date-fns";
import { pl } from "date-fns/locale";
import { Copy, Plus, Scissors } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useProjectTimeline } from "@/hooks/useProjectTimeline";
import { useProjectTimelineStore } from "@/stores/projectTimelineStore";
import { useAuthStore } from "@/stores/authStore";
import { ProjectTimelineFilters } from "./ProjectTimelineFilters";
import { ProjectTimelineRow } from "./ProjectTimelineRow";
import { TimelineHeader, MONTH_WIDTH, DAY_WIDTH } from "@/components/timeline/TimelineHeader";
import { TimelineBarDragPreview } from "@/components/timeline/TimelineBarDragPreview";
import { AssignmentModal } from "@/components/assignments/AssignmentModal";
import {
  updateAssignment,
  splitAssignment,
  duplicateAssignment,
} from "@/api/assignments";
import type { TimelineAssignment } from "@/types/assignment";
import type { ProjectTimelineAssignment, ProjectTimelineProject } from "@/types/project-timeline";
import { TIMELINE_LEFT_PANEL_WIDTH } from "@/lib/constants";
import { Search, FolderOpen } from "lucide-react";

function adaptForModal(
  assignment: ProjectTimelineAssignment,
  project: ProjectTimelineProject,
): TimelineAssignment {
  return {
    id: assignment.id,
    project_id: project.id,
    project_name: project.name,
    project_color: project.color,
    start_date: assignment.start_date,
    end_date: assignment.end_date,
    allocation_type: assignment.allocation_type,
    allocation_value: assignment.allocation_value,
    note: assignment.note,
    is_tentative: assignment.is_tentative,
    daily_hours: assignment.daily_hours,
  };
}

export function ProjectTimeline() {
  const queryClient = useQueryClient();
  const { data, isLoading, months, weeks, allDays, viewMode } = useProjectTimeline();
  const searchQuery = useProjectTimelineStore((s) => s.searchQuery);
  const currentUser = useAuthStore((s) => s.user);
  const isViewer = currentUser?.role === "viewer";

  const holidayMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (data?.holidays) {
      for (const h of data.holidays) map[h.date] = h.name;
    }
    return map;
  }, [data?.holidays]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<TimelineAssignment | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);
  const [defaultProjectId, setDefaultProjectId] = useState<number | null>(null);
  const [defaultStartDate, setDefaultStartDate] = useState<string | null>(null);

  const [dragPreview, setDragPreview] = useState<{
    assignment: TimelineAssignment;
    barWidth: number;
    showDailyHours: boolean;
  } | null>(null);

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
  const [timelineGridMaxHeight, setTimelineGridMaxHeight] = useState<string | undefined>(
    "min(80dvh, calc(100dvh - 12rem))",
  );

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
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
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
    viewMode === "weekly" ? allDays.length * DAY_WIDTH : months.length * MONTH_WIDTH;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const splitMutation = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string }) => splitAssignment(id, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Assignment podzielony");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => duplicateAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Assignment zduplikowany");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, data: patchData }: { id: number; data: Record<string, unknown> }) =>
      updateAssignment(id, patchData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
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
        splitDateLabel: format(parseISO(splitDate), "d.MM.yyyy", { locale: pl }),
        splitDateIsValid,
        assignmentId,
      });
      setModalOpen(false);
      setEditingAssignment(null);
    },
    [],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const d = event.active.data.current as
      | { assignment: TimelineAssignment; barWidth: number; showDailyHours: boolean }
      | undefined;
    if (d?.assignment != null) {
      setDragPreview({ assignment: d.assignment, barWidth: d.barWidth, showDailyHours: d.showDailyHours });
    }
  }, []);

  // D&D — move assignment to a different project
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const dragData = active.data.current as { assignment: TimelineAssignment; employeeId: number };
      const dropData = over.data.current as { projectId: number };
      if (!dragData || !dropData) return;
      // employeeId in drag data is actually the source projectId (passed by ProjectTimelineRow)
      if (dragData.employeeId === dropData.projectId) return;
      patchMutation.mutate(
        { id: dragData.assignment.id, data: { project_id: dropData.projectId } },
        {
          onSuccess: () => {
            const targetName =
              data?.projects.find((p) => p.id === dropData.projectId)?.name ?? "innego projektu";
            toast.success(`Assignment przeniesiony na ${targetName}`);
          },
        },
      );
    },
    [patchMutation, data],
  );

  const handleDragEndWithPreview = useCallback(
    (event: DragEndEvent) => {
      setDragPreview(null);
      handleDragEnd(event);
    },
    [handleDragEnd],
  );

  const handleResizeEnd = useCallback(
    (assignmentId: number, edge: "left" | "right", deltaPx: number) => {
      if (!data) return;
      let assignment: ProjectTimelineAssignment | undefined;
      for (const proj of data.projects) {
        assignment = proj.assignments.find((a) => a.id === assignmentId);
        if (assignment) break;
      }
      if (!assignment) return;

      let pxPerDay: number;
      if (viewMode === "weekly") {
        pxPerDay = DAY_WIDTH;
      } else {
        const totalPx = months.length * MONTH_WIDTH;
        const firstMonth = months[0];
        const lastMonth = months[months.length - 1];
        const firstDate = new Date(firstMonth.year, firstMonth.month - 1, 1);
        const lastDate = new Date(lastMonth.year, lastMonth.month, 0);
        const totalDays =
          Math.round((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        pxPerDay = totalPx / totalDays;
      }

      const daysDelta = Math.round(deltaPx / pxPerDay);
      if (daysDelta === 0) return;

      const patchData: Record<string, string> = {};
      if (edge === "left") {
        patchData.start_date = format(addDays(parseISO(assignment.start_date), daysDelta), "yyyy-MM-dd");
      } else {
        patchData.end_date = format(addDays(parseISO(assignment.end_date), daysDelta), "yyyy-MM-dd");
      }

      patchMutation.mutate(
        { id: assignmentId, data: patchData },
        { onSuccess: () => toast.success("Daty zaktualizowane") },
      );
    },
    [data, months, viewMode, patchMutation],
  );

  const handleAssignmentClick = (
    assignment: ProjectTimelineAssignment,
    project: ProjectTimelineProject,
  ) => {
    setEditingAssignment(adaptForModal(assignment, project));
    setEditingEmployeeId(assignment.employee_id);
    setDefaultProjectId(null);
    setDefaultStartDate(null);
    setModalOpen(true);
  };

  const handleEmptyClick = (projectId: number, dateKey: string) => {
    setEditingAssignment(null);
    setEditingEmployeeId(null);
    setDefaultProjectId(projectId);
    setDefaultStartDate(dateKey.length === 10 ? dateKey : `${dateKey}-01`);
    setModalOpen(true);
  };

  const handleNewAssignment = () => {
    setEditingAssignment(null);
    setEditingEmployeeId(null);
    setDefaultProjectId(null);
    setDefaultStartDate(null);
    setModalOpen(true);
  };

  const displayedProjects = data?.projects ?? [];
  const trimmedSearch = searchQuery.trim();

  return (
    <div>
      <div ref={toolbarRef} className="sticky top-0 z-30 bg-background px-6 pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Project Timeline</h2>
          {!isViewer && (
            <Button onClick={handleNewAssignment}>
              <Plus className="mr-2 h-4 w-4" />
              Dodaj assignment
            </Button>
          )}
        </div>
        <ProjectTimelineFilters count={isLoading ? undefined : displayedProjects.length} />
      </div>

      {isLoading ? (
        <div className="mx-6 rounded-md border">
          <div className="flex border-b">
            <div className="shrink-0 border-r p-3" style={{ width: TIMELINE_LEFT_PANEL_WIDTH }}>
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
              <div className="shrink-0 border-r p-3" style={{ width: TIMELINE_LEFT_PANEL_WIDTH }}>
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
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
      ) : !data || displayedProjects.length === 0 ? (
        <div className="mx-6 flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 px-6 py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted" aria-hidden>
            {trimmedSearch ? (
              <Search className="h-6 w-6 text-muted-foreground" />
            ) : (
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {trimmedSearch ? `Brak wyników dla „${trimmedSearch}"` : "Brak projektów"}
          </h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {trimmedSearch
              ? "Spróbuj innej frazy albo wyczyść wyszukiwanie. Jeśli kalendarz jest pusty, najpierw dodaj projekty."
              : "Dodaj projekty i assignmenty, aby zobaczyć plan projektów w tym widoku."}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndWithPreview}
          onDragCancel={() => setDragPreview(null)}
        >
          <div className="mx-6 min-w-0 rounded-md border bg-background shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            <div
              className="overflow-auto overscroll-contain"
              style={{ maxHeight: timelineGridMaxHeight }}
            >
              <div style={{ minWidth: TIMELINE_LEFT_PANEL_WIDTH + totalWidth }}>
                {/* Sticky header row */}
                <div
                  className="sticky top-0 z-20 flex border-b bg-muted shadow-sm"
                  style={{ minWidth: TIMELINE_LEFT_PANEL_WIDTH + totalWidth }}
                >
                  <div
                    className="sticky left-0 z-30 flex shrink-0 items-center border-r bg-muted px-3 py-2"
                    style={{ width: TIMELINE_LEFT_PANEL_WIDTH }}
                  >
                    <span className="text-sm font-medium">Projekt</span>
                  </div>
                  <div className="flex shrink-0" style={{ minWidth: totalWidth }}>
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

                {/* Project rows */}
                {displayedProjects.map((project, idx) => (
                  <ProjectTimelineRow
                    key={project.id}
                    project={project}
                    months={months}
                    allDays={allDays}
                    viewMode={viewMode}
                    holidayMap={holidayMap}
                    onAssignmentClick={(a) => handleAssignmentClick(a, project)}
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

          <DragOverlay dropAnimation={null}>
            {dragPreview ? (
              <TimelineBarDragPreview
                assignment={dragPreview.assignment}
                width={dragPreview.barWidth}
                showDailyHours={dragPreview.showDailyHours}
              />
            ) : null}
          </DragOverlay>
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
                splitMutation.mutate({ id: contextMenu.assignmentId, date: contextMenu.splitDate });
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

      <AssignmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingAssignment(null);
          setEditingEmployeeId(null);
        }}
        assignment={editingAssignment}
        defaultEmployeeId={editingEmployeeId}
        defaultProjectId={defaultProjectId}
        defaultStartDate={defaultStartDate}
      />
    </div>
  );
}
