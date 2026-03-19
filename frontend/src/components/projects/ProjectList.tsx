import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCrudList } from "@/hooks/useCrudList";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/types/ui";
import { SearchInput } from "@/components/ui/SearchInput";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
} from "@/api/projects";
import type { Project, ProjectCreateData } from "@/types/project";
import { ProjectForm } from "./ProjectForm";

const PROJECT_COLUMNS: DataTableColumn<Project>[] = [
  {
    id: "name",
    header: "Nazwa projektu",
    cell: (proj) => (
      <span className="flex items-center gap-2">
        <span
          className="inline-block h-4 w-4 rounded"
          style={{ backgroundColor: proj.color }}
        />
        {proj.name}
      </span>
    ),
  },
];

export function ProjectList() {
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
    queryKey: ["projects", debouncedSearch],
    queryFn: () => fetchProjects(debouncedSearch || undefined),
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

      <div className="mb-4">
        <SearchInput
          className="w-64"
          placeholder="Szukaj projektu..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
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
