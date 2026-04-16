import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCrudList } from "@/hooks/useCrudList";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/types/ui";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import {
  archiveProject,
  createProject,
  deleteProject,
  fetchProjects,
  unarchiveProject,
  updateProject,
} from "@/api/projects";
import type { Project, ProjectCreateData } from "@/types/project";
import { ProjectForm } from "./ProjectForm";
import { toast } from "sonner";

type StatusFilter = "active" | "archived" | "all";

const PROJECT_COLUMNS: DataTableColumn<Project>[] = [
  {
    id: "name",
    header: "Nazwa projektu",
    cell: (proj) => (
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-4 w-4 shrink-0 rounded"
          style={{ backgroundColor: proj.color }}
        />
        {proj.name}
        {proj.is_archived && (
          <Badge variant="secondary" className="text-xs">
            Zarchiwizowany
          </Badge>
        )}
      </span>
    ),
  },
];

export function ProjectList() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [archiveTarget, setArchiveTarget] = useState<Project | null>(null);

  const crud = useCrudList<Project, ProjectCreateData, Partial<ProjectCreateData>>({
    queryKey: ["projects"],
    createMutationFn: createProject,
    updateMutationFn: ({ id, data }) => updateProject(id, data),
    deleteMutationFn: (id) => deleteProject(id, true),
    successMessages: {
      create: "Projekt dodany",
      update: "Projekt zaktualizowany",
      delete: "Projekt usunięty",
    },
  });

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", debouncedSearch, statusFilter],
    queryFn: () => fetchProjects(debouncedSearch || undefined, statusFilter),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt zarchiwizowany");
      setArchiveTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const unarchiveMutation = useMutation({
    mutationFn: (id: number) => unarchiveProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Projekt przywrócony");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFormSubmit = (data: { name: string; color: string }) => {
    if (crud.editingItem) {
      crud.updateMutation.mutate({ id: crud.editingItem.id, data });
    } else {
      crud.createMutation.mutate(data);
    }
  };

  const emptyContent =
    projects.length === 0
      ? debouncedSearch
        ? `Brak wyników dla „${searchQuery}"`
        : statusFilter === "archived"
          ? "Brak zarchiwizowanych projektów."
          : "Brak projektów. Dodaj pierwszy."
      : undefined;

  return (
    <div className="p-6">
      <PageHeader
        title="Projekty"
        action={
          <Button onClick={crud.openAddForm}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj projekt
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          className="w-64"
          placeholder="Szukaj projektu..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <div className="flex items-center gap-1">
          {(
            [
              { value: "all", label: "Wszystkie" },
              { value: "active", label: "Aktywne" },
              { value: "archived", label: "Zarchiwizowane" },
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
      </div>

      <DataTable<Project>
        data={projects}
        columns={PROJECT_COLUMNS}
        getRowKey={(proj) => proj.id}
        renderActions={(proj) => (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => crud.handleEdit(proj)}
              aria-label={`Edytuj ${proj.name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {proj.is_archived ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => unarchiveMutation.mutate(proj.id)}
                disabled={unarchiveMutation.isPending}
                aria-label={`Przywróć ${proj.name}`}
              >
                <ArchiveRestore className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setArchiveTarget(proj)}
                aria-label={`Archiwizuj ${proj.name}`}
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => crud.handleDeleteClick(proj)}
              aria-label={`Usuń ${proj.name}`}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
        isLoading={isLoading}
        emptyContent={emptyContent}
      />

      <ProjectForm
        open={crud.formOpen}
        onClose={crud.closeForm}
        onSubmit={handleFormSubmit}
        project={crud.editingItem}
        isSubmitting={
          crud.createMutation.isPending || crud.updateMutation.isPending
        }
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(o) => !o && setArchiveTarget(null)}
        title="Archiwizuj projekt"
        description={
          archiveTarget ? (
            <>
              Czy na pewno chcesz zarchiwizować projekt{" "}
              <strong>{archiveTarget.name}</strong>? Istniejące assignmenty
              pozostaną bez zmian, ale nie będzie można przypisać do niego
              nowych.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Archiwizuj"
        pendingLabel="Archiwizowanie..."
        onConfirm={() => archiveMutation.mutate(archiveTarget!.id)}
        isPending={archiveMutation.isPending}
        contentClassName="max-w-md"
      />

      <ConfirmDialog
        open={crud.deleteTarget !== null}
        onOpenChange={(o) => !o && crud.setDeleteTarget(null)}
        title="Usuń projekt"
        description={
          crud.deleteTarget ? (
            <>
              Czy na pewno chcesz usunąć projekt{" "}
              <strong>{crud.deleteTarget.name}</strong>? Przyszłe assignmenty
              zostaną usunięte, a bieżące skrócone do dzisiaj.
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
