import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCrudList } from "@/hooks/useCrudList";
import { useClickOutside } from "@/hooks/useClickOutside";
import { useTeams } from "@/hooks/useTeams";
import { useTechnologies } from "@/hooks/useTechnologies";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Plus,
  Trash2,
  Users,
  Code2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/types/ui";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { FilterButton } from "@/components/common/FilterButton";
import { FilterChipPanel } from "@/components/common/FilterChipPanel";
import { cn } from "@/lib/utils";
import { pluralizePl } from "@/lib/pluralizePl";
import {
  archiveEmployee,
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  unarchiveEmployee,
  updateEmployee,
} from "@/api/employees";
import type { Employee, EmployeeCreateData } from "@/types/employee";
import { EmployeeForm } from "./EmployeeForm";

type StatusFilter = "active" | "archived" | "all";

const EMPLOYEE_COLUMNS: DataTableColumn<Employee>[] = [
  {
    id: "name",
    header: "Nazwisko i imię",
    cell: (emp) => (
      <span className="flex items-center gap-2">
        {emp.last_name} {emp.first_name}
        {emp.is_archived && (
          <Badge variant="secondary" className="text-xs">
            Zarchiwizowany
          </Badge>
        )}
      </span>
    ),
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
        <Badge variant="secondary">{emp.team.name}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "technologies",
    header: "Technologie",
    cell: (emp) =>
      emp.technologies.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {emp.technologies.map((t) => (
            <Badge key={t.id} variant="outline">
              {t.name}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function EmployeeList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [archiveTarget, setArchiveTarget] = useState<Employee | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<number[]>([]);
  const [selectedTechnologyIds, setSelectedTechnologyIds] = useState<number[]>(
    [],
  );
  const [openPanel, setOpenPanel] = useState<"teams" | "technologies" | null>(
    null,
  );
  const filterRef = useRef<HTMLDivElement>(null);
  useClickOutside(filterRef, () => setOpenPanel(null), openPanel !== null);
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: technologies = [], isLoading: technologiesLoading } =
    useTechnologies();

  const crud = useCrudList<
    Employee,
    EmployeeCreateData,
    Partial<EmployeeCreateData>
  >({
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

  const hasFilters =
    selectedTeamIds.length > 0 || selectedTechnologyIds.length > 0;

  const { data: employees = [], isLoading } = useQuery({
    queryKey: [
      "employees",
      selectedTeamIds,
      selectedTechnologyIds,
      debouncedSearch,
      statusFilter,
    ],
    queryFn: () =>
      fetchEmployees(
        selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
        selectedTechnologyIds.length > 0 ? selectedTechnologyIds : undefined,
        debouncedSearch || undefined,
        statusFilter,
      ),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Pracownik zarchiwizowany");
      setArchiveTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => unarchiveEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      toast.success("Pracownik przywrócony");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFormSubmit = (data: EmployeeCreateData) => {
    if (crud.editingItem) {
      crud.updateMutation.mutate({ id: crud.editingItem.id, data });
    } else {
      crud.createMutation.mutate(data);
    }
  };

  const emptyContent =
    employees.length === 0
      ? debouncedSearch || hasFilters
        ? `Brak wyników${debouncedSearch ? ` dla „${searchQuery}"` : ""}${hasFilters ? " dla wybranych filtrów" : ""}`
        : statusFilter === "archived"
          ? "Brak zarchiwizowanych pracowników."
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

      <div className="mb-4 space-y-2" ref={filterRef}>
        <div className="flex items-center gap-3">
          <SearchInput
            className="w-64"
            placeholder="Szukaj pracownika..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <FilterButton
            label="Zespoły"
            icon={Users}
            count={selectedTeamIds.length}
            active={selectedTeamIds.length > 0}
            open={openPanel === "teams"}
            onClick={() =>
              setOpenPanel((p) => (p === "teams" ? null : "teams"))
            }
          />
          <FilterButton
            label="Technologie"
            icon={Code2}
            count={selectedTechnologyIds.length}
            active={selectedTechnologyIds.length > 0}
            open={openPanel === "technologies"}
            onClick={() =>
              setOpenPanel((p) =>
                p === "technologies" ? null : "technologies",
              )
            }
          />
          <div className="flex items-center gap-1">
            {(
              [
                { value: "all", label: "Wszyscy" },
                { value: "active", label: "Aktywni" },
                { value: "archived", label: "Zarchiwizowani" },
              ] as { value: StatusFilter; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={cn(
                  "rounded-md border px-2 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  statusFilter === value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
                aria-pressed={statusFilter === value}
              >
                {label}
              </button>
            ))}
          </div>
          {(hasFilters || searchQuery.trim() !== "") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                setSelectedTeamIds([]);
                setSelectedTechnologyIds([]);
                setSearchQuery("");
                setOpenPanel(null);
              }}
            >
              <X className="mr-1 h-3 w-3" />
              Wyczyść
            </Button>
          )}
          {!isLoading && (
            <span className="ml-auto text-sm text-muted-foreground tabular-nums">
              {employees.length}{" "}
              {pluralizePl(employees.length, [
                "pracownik",
                "pracownicy",
                "pracowników",
              ])}
            </span>
          )}
        </div>

        {openPanel === "teams" && (
          <FilterChipPanel
            options={teams}
            selectedIds={selectedTeamIds}
            onChange={setSelectedTeamIds}
            isLoading={teamsLoading}
            emptyLabel="Brak zespołów"
          />
        )}
        {openPanel === "technologies" && (
          <FilterChipPanel
            options={technologies}
            selectedIds={selectedTechnologyIds}
            onChange={setSelectedTechnologyIds}
            isLoading={technologiesLoading}
            emptyLabel="Brak technologii"
          />
        )}
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
            {emp.is_archived ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unarchiveMutation.mutate(emp.id)}
                disabled={unarchiveMutation.isPending}
                aria-label={`Przywróć ${emp.last_name} ${emp.first_name}`}
              >
                <ArchiveRestore className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setArchiveTarget(emp)}
                aria-label={`Archiwizuj ${emp.last_name} ${emp.first_name}`}
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
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
        key={`${crud.editingItem?.id ?? "new"}-${crud.formOpen}`}
        open={crud.formOpen}
        onClose={crud.closeForm}
        onSubmit={handleFormSubmit}
        employee={crud.editingItem}
        isSubmitting={
          crud.createMutation.isPending || crud.updateMutation.isPending
        }
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title="Archiwizuj pracownika"
        description={
          archiveTarget ? (
            <div className="space-y-2">
              <p>
                Czy na pewno chcesz zarchiwizować pracownika{" "}
                <strong>
                  {archiveTarget.last_name} {archiveTarget.first_name}
                </strong>
                ?
              </p>
              <p>Oznacza to, że:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Zakończone assignmenty pozostaną w historii.</li>
                <li>Trwające zostaną skrócone do dzisiaj.</li>
                <li>Przyszłe zostaną usunięte.</li>
              </ul>
              <p>
                Nie będzie można też przypisać tego pracownika do nowych
                projektów. Pracownik zniknie z kalendarza pracowników, ale
                pozostanie widoczny w kalendarzu projektów.
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmLabel="Archiwizuj"
        pendingLabel="Archiwizowanie..."
        onConfirm={() =>
          archiveTarget && archiveMutation.mutate(archiveTarget.id)
        }
        isPending={archiveMutation.isPending}
        contentClassName="max-w-md"
      />

      <ConfirmDialog
        open={crud.deleteTarget !== null}
        onOpenChange={(o) => !o && crud.setDeleteTarget(null)}
        title="Usuń pracownika"
        description={
          crud.deleteTarget ? (
            <div className="space-y-2">
              <p>
                Czy na pewno chcesz trwale usunąć pracownika{" "}
                <strong>
                  {crud.deleteTarget.last_name} {crud.deleteTarget.first_name}
                </strong>
                ? Oznacza to, że znikną też wszystkie assignmenty z nim
                związane. Jeśli chcesz tylko zakończyć współpracę i zachować
                historię, zarchiwizuj go zamiast usuwać.
              </p>
              <p>
                <strong>Tej operacji nie da się cofnąć.</strong>
              </p>
            </div>
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
