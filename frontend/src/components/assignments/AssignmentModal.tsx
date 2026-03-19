import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchEmployees } from "@/api/employees";
import { fetchProjects } from "@/api/projects";
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "@/api/assignments";
import type { AssignmentModalProps } from "@/types/assignment";
import { AssignmentFormEmployeeProject } from "./AssignmentFormEmployeeProject";
import { AssignmentFormDates } from "./AssignmentFormDates";
import { AssignmentFormAllocation } from "./AssignmentFormAllocation";
import { AssignmentFormNote } from "./AssignmentFormNote";
import { AssignmentFormFooter } from "./AssignmentFormFooter";

export function AssignmentModal({
  open,
  onClose,
  assignment,
  defaultEmployeeId,
  defaultStartDate,
}: AssignmentModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!assignment;

  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allocationType, setAllocationType] = useState("percentage");
  const [allocationValue, setAllocationValue] = useState("");
  const [note, setNote] = useState("");
  const [isTentative, setIsTentative] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchEmployees(),
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => fetchProjects(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (assignment) {
      setEmployeeId(defaultEmployeeId ? String(defaultEmployeeId) : "");
      setProjectId(String(assignment.project_id));
      setStartDate(assignment.start_date);
      setEndDate(assignment.end_date);
      setAllocationType(assignment.allocation_type);
      setAllocationValue(String(assignment.allocation_value));
      setNote(assignment.note ?? "");
      setIsTentative(assignment.is_tentative);
    } else {
      setEmployeeId(defaultEmployeeId ? String(defaultEmployeeId) : "");
      setProjectId("");
      setStartDate(defaultStartDate ?? "");
      setEndDate("");
      setAllocationType("percentage");
      setAllocationValue("");
      setNote("");
      setIsTentative(false);
    }
    setShowDeleteConfirm(false);
  }, [open, assignment, defaultEmployeeId, defaultStartDate]);

  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Assignment utworzony");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateAssignment>) =>
      updateAssignment(data[0], data[1]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Assignment zaktualizowany");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Assignment usunięty");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data = {
      employee_id: Number(employeeId),
      project_id: Number(projectId),
      start_date: startDate,
      end_date: endDate,
      allocation_type: allocationType,
      allocation_value: Number(allocationValue),
      note: note,
      is_tentative: isTentative,
    };

    if (isEditing && assignment) {
      updateMutation.mutate([assignment.id, data]);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edytuj assignment" : "Nowy assignment"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <AssignmentFormEmployeeProject
            employeeId={employeeId}
            projectId={projectId}
            onEmployeeChange={setEmployeeId}
            onProjectChange={setProjectId}
            employees={employees}
            projects={projects}
          />

          <AssignmentFormDates
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />

          <AssignmentFormAllocation
            allocationType={allocationType}
            allocationValue={allocationValue}
            onAllocationTypeChange={setAllocationType}
            onAllocationValueChange={setAllocationValue}
          />

          <AssignmentFormNote
            note={note}
            isTentative={isTentative}
            onNoteChange={setNote}
            onTentativeChange={setIsTentative}
          />

          <AssignmentFormFooter
            isEditing={isEditing}
            showDeleteConfirm={showDeleteConfirm}
            onDeleteClick={() => setShowDeleteConfirm(true)}
            onConfirmDelete={() =>
              assignment && deleteMutation.mutate(assignment.id)
            }
            onCancelDelete={() => setShowDeleteConfirm(false)}
            onClose={onClose}
            isPending={isPending}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
