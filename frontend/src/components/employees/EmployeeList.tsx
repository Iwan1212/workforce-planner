import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamFilterChips } from "@/components/common/TeamFilterChips";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
} from "@/api/employees";
import type { Employee } from "@/types/employee";
import { TEAM_LABELS } from "@/lib/constants";
import { EmployeeForm } from "./EmployeeForm";

export function EmployeeList() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const toggleTeam = (team: string) => {
    if (selectedTeams.includes(team)) {
      setSelectedTeams(selectedTeams.filter((t) => t !== team));
    } else {
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const noneSelected = selectedTeams.length === 0;
  const selectAllTeams = () => setSelectedTeams([]);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", selectedTeams, debouncedSearch],
    queryFn: () =>
      fetchEmployees(
        noneSelected ? undefined : selectedTeams,
        debouncedSearch || undefined,
      ),
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
        email: string | null;
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
    email?: string | null;
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
      <PageHeader
        title="Pracownicy"
        action={
          <Button
            onClick={() => {
              setEditingEmployee(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Dodaj pracownika
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          className="w-64"
          placeholder="Szukaj pracownika..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <TeamFilterChips
          selectedTeams={selectedTeams}
          onToggleTeam={toggleTeam}
          onSelectAll={selectAllTeams}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Ładowanie...</p>
      ) : employees.length === 0 && (debouncedSearch || !noneSelected) ? (
        <p className="text-muted-foreground">
          Brak wyników{debouncedSearch ? <> dla &ldquo;{searchQuery}&rdquo;</> : null}
          {!noneSelected ? <> w wybranych zespołach</> : null}
        </p>
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
                  Email
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
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {emp.email || "—"}
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Usuń pracownika"
        description={
          deleteTarget ? (
            <>
              Czy na pewno chcesz usunąć pracownika{" "}
              <strong>
                {deleteTarget.last_name} {deleteTarget.first_name}
              </strong>
              ? Przyszłe assignmenty zostaną usunięte, a bieżące skrócone do
              dzisiaj.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Usuń"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        isPending={deleteMutation.isPending}
        contentClassName="max-w-md"
      />
    </div>
  );
}
