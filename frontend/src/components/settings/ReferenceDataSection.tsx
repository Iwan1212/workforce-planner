import { type FormEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/DataTable";
import { DialogWrapper } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCrudList } from "@/hooks/useCrudList";
import type { DataTableColumn } from "@/types/ui";

interface RefItem {
  id: number;
  name: string;
}

interface ReferenceDataSectionProps<T extends RefItem> {
  /** Genitive/accusative label used in dialogs, e.g. "zespół" / "technologię". */
  entityLabel: string;
  addButtonLabel: string;
  queryKey: string;
  fetchAll: () => Promise<T[]>;
  create: (data: { name: string }) => Promise<T>;
  update: (params: { id: number; data: { name: string } }) => Promise<T>;
  remove: (id: number) => Promise<unknown>;
  /** Whether the current user may delete (admin-only on the backend). */
  canDelete: boolean;
}

export function ReferenceDataSection<T extends RefItem>({
  entityLabel,
  addButtonLabel,
  queryKey,
  fetchAll,
  create,
  update,
  remove,
  canDelete,
}: ReferenceDataSectionProps<T>) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: fetchAll,
  });

  const crud = useCrudList<T, { name: string }, { name: string }>({
    queryKey: [queryKey],
    createMutationFn: create,
    updateMutationFn: update,
    deleteMutationFn: remove,
    successMessages: {
      create: `Dodano ${entityLabel}`,
      update: "Zapisano zmiany",
      delete: `Usunięto ${entityLabel}`,
    },
    // Team/technology changes are embedded in employee & timeline responses.
    additionalInvalidateKeys: [["employees"], ["timeline"]],
  });

  const columns: DataTableColumn<T>[] = [
    { id: "name", header: "Nazwa", cell: (item) => item.name },
  ];

  const handleSubmit = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (crud.editingItem) {
      crud.updateMutation.mutate({
        id: crud.editingItem.id,
        data: { name: trimmed },
      });
    } else {
      crud.createMutation.mutate({ name: trimmed });
    }
  };

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={crud.openAddForm}>
          <Plus className="mr-1.5 h-4 w-4" />
          {addButtonLabel}
        </Button>
      </div>

      <div>
        <DataTable<T>
          data={items}
          columns={columns}
          getRowKey={(item) => item.id}
          renderActions={(item) => (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => crud.handleEdit(item)}
                aria-label={`Edytuj ${item.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              {canDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => crud.handleDeleteClick(item)}
                  aria-label={`Usuń ${item.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </>
          )}
          isLoading={isLoading}
          emptyContent={`Brak. Dodaj pierwszy wpis.`}
        />
      </div>

      <NameFormDialog
        key={`${crud.editingItem?.id ?? "new"}-${crud.formOpen}`}
        open={crud.formOpen}
        onClose={crud.closeForm}
        initialName={crud.editingItem?.name ?? ""}
        title={
          crud.editingItem
            ? `Edytuj ${entityLabel}`
            : `Dodaj ${entityLabel}`
        }
        isSubmitting={
          crud.createMutation.isPending || crud.updateMutation.isPending
        }
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={crud.deleteTarget !== null}
        onOpenChange={(o) => !o && crud.setDeleteTarget(null)}
        title={`Usuń ${entityLabel}`}
        description={
          crud.deleteTarget ? (
            <>
              Czy na pewno chcesz trwale usunąć{" "}
              <strong>{crud.deleteTarget.name}</strong>? Zostanie odpięty od
              wszystkich pracowników, którzy go mają.
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

interface NameFormDialogProps {
  open: boolean;
  onClose: () => void;
  initialName: string;
  title: string;
  isSubmitting?: boolean;
  onSubmit: (name: string) => void;
}

function NameFormDialog({
  open,
  onClose,
  initialName,
  title,
  isSubmitting,
  onSubmit,
}: NameFormDialogProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name);
  };

  return (
    <DialogWrapper
      open={open}
      onClose={onClose}
      title={title}
      form={{
        onSubmit: handleSubmit,
        isSubmitting,
        submitLabel: "Zapisz",
        submitDisabled: !name.trim(),
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="ref-name">Nazwa</Label>
        <Input
          id="ref-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
    </DialogWrapper>
  );
}
