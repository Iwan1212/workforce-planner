import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssignmentFormDatesProps } from "@/types/assignment";

export function AssignmentFormDates({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: AssignmentFormDatesProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Data od</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Data do</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          min={startDate || undefined}
          required
        />
      </div>
    </div>
  );
}
