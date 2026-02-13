import { type FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchEmployees } from "@/api/employees";
import { fetchProjects } from "@/api/projects";
import {
  createAssignment,
  updateAssignment,
  deleteAssignment,
  type TimelineAssignment,
} from "@/api/assignments";

interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  assignment?: TimelineAssignment | null;
  defaultEmployeeId?: number | null;
  defaultStartDate?: string | null;
}

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchEmployees(),
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
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
    } else {
      setEmployeeId(defaultEmployeeId ? String(defaultEmployeeId) : "");
      setProjectId("");
      setStartDate(defaultStartDate ?? "");
      setEndDate("");
      setAllocationType("percentage");
      setAllocationValue("");
      setNote("");
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
          <div className="space-y-2">
            <Label htmlFor="assignment-employee">Pracownik</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="assignment-employee">
                <SelectValue placeholder="Wybierz pracownika" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.last_name} {emp.first_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignment-project">Projekt</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="assignment-project">
                <SelectValue placeholder="Wybierz projekt" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={String(proj.id)}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: proj.color }}
                      />
                      {proj.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data od</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data do</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="assignment-alloc-type">Typ alokacji</Label>
              <Select value={allocationType} onValueChange={setAllocationType}>
                <SelectTrigger id="assignment-alloc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Procent (%)</SelectItem>
                  <SelectItem value="monthly_hours">Godziny / msc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {allocationType === "percentage"
                  ? "Wartość (%)"
                  : "Godziny / msc"}
              </Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={allocationValue}
                onChange={(e) => setAllocationValue(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notatka</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opcjonalna notatka..."
            />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {isEditing && !showDeleteConfirm && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                className="sm:mr-auto"
              >
                Usuń
              </Button>
            )}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2 sm:mr-auto">
                <span className="text-sm text-destructive">Na pewno?</span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    assignment && deleteMutation.mutate(assignment.id)
                  }
                  disabled={isPending}
                >
                  Tak, usuń
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Nie
                </Button>
              </div>
            )}
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
