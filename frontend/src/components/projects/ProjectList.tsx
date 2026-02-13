import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createProject,
  deleteProject,
  fetchProjects,
  updateProject,
  type Project,
} from "@/api/projects";
import { ProjectForm } from "./ProjectForm";

export function ProjectList() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setFormOpen(false);
      toast.success("Projekt dodany");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<{ name: string; color: string }>;
    }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setFormOpen(false);
      setEditingProject(null);
      toast.success("Projekt zaktualizowany");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProject(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteTarget(null);
      toast.success("Projekt usunięty");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFormSubmit = (data: { name: string; color: string }) => {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (proj: Project) => {
    setEditingProject(proj);
    setFormOpen(true);
  };

  const handleDeleteClick = (proj: Project) => {
    setDeleteTarget(proj);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Projekty</h2>
        <Button
          onClick={() => {
            setEditingProject(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Dodaj projekt
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Ładowanie...</p>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground">Brak projektów. Dodaj pierwszy.</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Nazwa projektu
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((proj) => (
                <tr key={proj.id} className="border-b last:border-0">
                  <td className="px-4 py-3 text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-4 w-4 rounded"
                        style={{ backgroundColor: proj.color }}
                      />
                      {proj.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(proj)}
                      aria-label={`Edytuj ${proj.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(proj)}
                      aria-label={`Usuń ${proj.name}`}
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

      <ProjectForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingProject(null);
        }}
        onSubmit={handleFormSubmit}
        project={editingProject}
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
            <DialogTitle>Usuń projekt</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć projekt{" "}
              <strong>{deleteTarget?.name}</strong>? Przyszłe assignmenty
              zostaną usunięte, a bieżące skrócone do dzisiaj.
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
