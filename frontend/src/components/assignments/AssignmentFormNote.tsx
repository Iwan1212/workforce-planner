import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssignmentFormNoteProps } from "@/types/assignment";

export function AssignmentFormNote({
  note,
  isTentative,
  onNoteChange,
  onTentativeChange,
}: AssignmentFormNoteProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <input
          id="assignment-tentative"
          type="checkbox"
          checked={isTentative}
          onChange={(e) => onTentativeChange(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-primary"
        />
        <Label
          htmlFor="assignment-tentative"
          className="cursor-pointer font-normal"
        >
          Tentative - niepotwierdzony assignment
        </Label>
      </div>

      <div className="space-y-2">
        <Label>Notatka</Label>
        <Input
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Opcjonalna notatka..."
        />
      </div>
    </>
  );
}
