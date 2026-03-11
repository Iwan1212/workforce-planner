import { differenceInCalendarDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VacationInfo } from "@/api/assignments";
import { LEAVE_TYPE_LABELS } from "@/lib/constants";

function formatDatePL(iso: string): string {
  return parseISO(iso).toLocaleDateString("pl-PL");
}

interface VacationDialogProps {
  open: boolean;
  onClose: () => void;
  vacation: VacationInfo | null;
}

export function VacationDialog({ open, onClose, vacation }: VacationDialogProps) {
  if (!vacation) return null;

  const days =
    differenceInCalendarDays(parseISO(vacation.end_date), parseISO(vacation.start_date)) + 1;
  const label = LEAVE_TYPE_LABELS[vacation.leave_type] ?? vacation.leave_type;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Okres</span>
            <span className="font-medium">
              {formatDatePL(vacation.start_date)} — {formatDatePL(vacation.end_date)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Czas trwania</span>
            <span className="font-medium">{days} dni</span>
          </div>

          {vacation.employee_email && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Źródło</span>
              <span className="font-medium">Calamari ({vacation.employee_email})</span>
            </div>
          )}

          {vacation.synced_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ostatnia synchronizacja</span>
              <span className="font-medium">
                {new Date(vacation.synced_at).toLocaleString("pl-PL")}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Zamknij
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
