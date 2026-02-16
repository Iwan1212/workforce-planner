import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
  type Employee,
} from "@/api/employees";
import { EmployeeForm, TEAM_LABELS } from "./EmployeeForm";

export function EmployeeList() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => fetchEmployees(),
  });

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setFormOpen(false);
      toast.success("Pracownik dodany");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{
        first_name: string;
        last_name: string;
        team: string | null;
      }>;
    }) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setFormOpen(false);
      setEditingEmployee(null);
      toast.success("Pracownik zaktualizowany");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEmployee(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setDeleteTarget(null);
      toast.success("Pracownik usunięty");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFormSubmit = (data: {
    first_name: string;
    last_name: string;
    team: string | null;
  }) => {
    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormOpen(true);
  };

  const handleDeleteClick = (emp: Employee) => {
    setDeleteTarget(emp);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Pracownicy</h2>
        <Button
          onClick={() => {
            setEditingEmployee(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Dodaj pracownika
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Ładowanie...</p>
      ) : employees.length === 0 ? (
        <p className="text-muted-foreground">
          Brak pracowników. Dodaj pierwszego.
        </p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Nazwisko i imię
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Zespół
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm">
                    {emp.last_name} {emp.first_name}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {emp.team ? (
                      <Badge variant="secondary">
                        {TEAM_LABELS[emp.team] ?? emp.team}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(emp)}
                      aria-label={`Edytuj ${emp.last_name} ${emp.first_name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(emp)}
                      aria-label={`Usuń ${emp.last_name} ${emp.first_name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmployeeForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={handleFormSubmit}
        employee={editingEmployee}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuń pracownika</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć pracownika{" "}
              <strong>
                {deleteTarget?.last_name} {deleteTarget?.first_name}
              </strong>
              ? Przyszłe assignmenty zostaną usunięte, a bieżące skrócone do
              dzisiaj.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              Usuń
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
