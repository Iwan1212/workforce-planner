import { useCallback, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { addDays, parseISO, format } from "date-fns";
import { Plus } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTimeline } from "@/hooks/useTimeline";
import { TimelineFilters } from "./TimelineFilters";
import { TimelineHeader, MONTH_WIDTH, DAY_WIDTH } from "./TimelineHeader";
import { TimelineRow } from "./TimelineRow";
import { AssignmentModal } from "@/components/assignments/AssignmentModal";
import {
  updateAssignment,
  type TimelineAssignment,
} from "@/api/assignments";

export function Timeline() {
  const queryClient = useQueryClient();
  const { data, isLoading, months, weeks, allDays, viewMode } = useTimeline();

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

  const monthDefs = months.map((m) => ({
    key: m.key,
    year: m.year,
    month: m.month,
  }));

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Timeline</h2>
        <Button onClick={handleNewAssignment}>
          <Plus className="mr-2 h-4 w-4" />
          Nowy assignment
        </Button>
      </div>

      <TimelineFilters />

      {isLoading ? (
        <div className="rounded-md border">
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
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">
            Brak pracowników do wyświetlenia. Dodaj pracowników i assignmenty.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              {/* Header */}
              <div className="flex">
                <div className="sticky left-0 z-20 flex w-[250px] flex-shrink-0 items-center border-b border-r bg-background px-3 py-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Pracownik
                  </span>
                </div>
                <TimelineHeader
                  viewMode={viewMode}
                  months={months}
                  workingDaysPerMonth={data.working_days_per_month}
                  weeks={weeks}
                  allDays={allDays}
                  holidayMap={holidayMap}
                />
              </div>

              {/* Rows */}
              {data.employees.map((emp, idx) => (
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
                  onAssignmentClick={(a) => handleAssignmentClick(a, emp.id)}
                  onEmptyClick={handleEmptyClick}
                  onResizeEnd={handleResizeEnd}
                  isOdd={idx % 2 === 1}
                />
              ))}
            </div>
          </div>
        </DndContext>
      )}

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
