import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCrudList } from "@/hooks/useCrudList";
import { useTeamSelection } from "@/hooks/useTeamSelection";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/types/ui";
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
import type { Employee, EmployeeCreateData } from "@/types/employee";
import { TEAM_LABELS } from "@/lib/constants";
import { EmployeeForm } from "./EmployeeForm";

const EMPLOYEE_COLUMNS: DataTableColumn<Employee>[] = [
  {
    id: "name",
    header: "Nazwisko i imię",
    cell: (emp) => `${emp.last_name} ${emp.first_name}`,
  },
  {
    id: "email",
    header: "Email",
    cell: (emp) => (
      <span className="text-muted-foreground">{emp.email || "—"}</span>
    ),
  },
  {
    id: "team",
    header: "Zespół",
    cell: (emp) =>
      emp.team ? (
        <Badge variant="secondary">{TEAM_LABELS[emp.team] ?? emp.team}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function EmployeeList() {
  const { selectedTeams, toggleTeam, selectAllTeams } = useTeamSelection();
  const noneSelected = selectedTeams.length === 0;

  const crud = useCrudList<Employee, EmployeeCreateData, Partial<EmployeeCreateData>>({
    queryKey: ["employees"],
    createMutationFn: createEmployee,
    updateMutationFn: ({ id, data }) => updateEmployee(id, data),
    deleteMutationFn: (id) => deleteEmployee(id, true),
    successMessages: {
      create: "Pracownik dodany",
      update: "Pracownik zaktualizowany",
      delete: "Pracownik usunięty",
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", selectedTeams, debouncedSearch],
    queryFn: () =>
      fetchEmployees(
        noneSelected ? undefined : selectedTeams,
        debouncedSearch || undefined,
      ),
  });

  const handleFormSubmit = (data: {
    first_name: string;
    last_name: string;
    team: string | null;
    email?: string | null;
  }) => {
    if (crud.editingItem) {
      crud.updateMutation.mutate({ id: crud.editingItem.id, data });
    } else {
      crud.createMutation.mutate(data);
    }
  };

  const emptyContent =
    employees.length === 0
      ? debouncedSearch || !noneSelected
        ? `Brak wyników${debouncedSearch ? ` dla „${searchQuery}"` : ""}${!noneSelected ? " w wybranych zespołach" : ""}`
        : "Brak pracowników. Dodaj pierwszego."
      : undefined;

  return (
    <div className="p-6">
      <PageHeader
        title="Pracownicy"
        action={
          <Button onClick={crud.openAddForm}>
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

      <DataTable<Employee>
        data={employees}
        columns={EMPLOYEE_COLUMNS}
        getRowKey={(emp) => emp.id}
        renderActions={(emp) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => crud.handleEdit(emp)}
              aria-label={`Edytuj ${emp.last_name} ${emp.first_name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => crud.handleDeleteClick(emp)}
              aria-label={`Usuń ${emp.last_name} ${emp.first_name}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
        isLoading={isLoading}
        emptyContent={emptyContent}
      />

      <EmployeeForm
        open={crud.formOpen}
        onClose={crud.closeForm}
        onSubmit={handleFormSubmit}
        employee={crud.editingItem}
        isSubmitting={
          crud.createMutation.isPending || crud.updateMutation.isPending
        }
      />

      <ConfirmDialog
        open={crud.deleteTarget !== null}
        onOpenChange={(o) => !o && crud.setDeleteTarget(null)}
        title="Usuń pracownika"
        description={
          crud.deleteTarget ? (
            <>
              Czy na pewno chcesz usunąć pracownika{" "}
              <strong>
                {crud.deleteTarget.last_name} {crud.deleteTarget.first_name}
              </strong>
              ? Przyszłe assignmenty zostaną usunięte, a bieżące skrócone do
              dzisiaj.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Usuń"
        pendingLabel="Usuwanie..."
        variant="destructive"
        onConfirm={crud.handleDeleteConfirm}
        isPending={crud.deleteMutation.isPending}
        contentClassName="max-w-md"
      />
    </div>
  );
}
