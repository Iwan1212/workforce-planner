import { addDays, format, getDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { DialogWrapper } from "@/components/ui/dialog";
import type { VacationDialogProps } from "@/types/timeline";
import { LEAVE_TYPE_LABELS } from "@/lib/constants";

function formatDatePL(iso: string): string {
  return parseISO(iso).toLocaleDateString("pl-PL");
}

function countWorkingDays(
  startIso: string,
  endIso: string,
  holidayMap: Record<string, string>,
): number {
  let count = 0;
  let current = parseISO(startIso);
  const end = parseISO(endIso);
  while (current <= end) {
    const dow = getDay(current);
    const key = format(current, "yyyy-MM-dd");
    if (dow !== 0 && dow !== 6 && !holidayMap[key]) {
      count++;
    }
    current = addDays(current, 1);
  }
  return count;
}

export function VacationDialog({
  open,
  onClose,
  vacation,
  holidayMap,
}: VacationDialogProps) {
  if (!vacation) return null;

  const days = countWorkingDays(
    vacation.start_date,
    vacation.end_date,
    holidayMap,
  );
  const label = LEAVE_TYPE_LABELS[vacation.leave_type] ?? vacation.leave_type;

  return (
    <DialogWrapper
      open={open}
      onClose={onClose}
      title={label}
      contentClassName="max-w-sm"
      footer={
        <Button variant="outline" onClick={onClose}>
          Zamknij
        </Button>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Okres</span>
          <span className="font-medium">
            {formatDatePL(vacation.start_date)} —{" "}
            {formatDatePL(vacation.end_date)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">Czas trwania</span>
          <span className="font-medium">{days} dni</span>
        </div>

        {vacation.employee_email && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Źródło</span>
            <span className="font-medium">
              Calamari ({vacation.employee_email})
            </span>
          </div>
        )}

        {vacation.synced_at && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Ostatnia synchronizacja
            </span>
            <span className="font-medium">
              {new Date(vacation.synced_at).toLocaleString("pl-PL")}
            </span>
          </div>
        )}
      </div>
    </DialogWrapper>
  );
}
