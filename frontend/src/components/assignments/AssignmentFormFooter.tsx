import { Button } from "@/components/ui/button";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import type { AssignmentFormFooterProps } from "@/types/assignment";

export function AssignmentFormFooter({
  isEditing,
  showDeleteConfirm,
  onDeleteClick,
  onConfirmDelete,
  onCancelDelete,
  onClose,
  isPending,
}: AssignmentFormFooterProps) {
  return (
    <DialogFooter className="flex-col gap-2 sm:flex-row">
      {isEditing && !showDeleteConfirm && (
        <Button
          type="button"
          variant="destructive"
          onClick={onDeleteClick}
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
            onClick={onConfirmDelete}
            disabled={isPending}
          >
            Tak, usuń
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancelDelete}
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
  );
}
