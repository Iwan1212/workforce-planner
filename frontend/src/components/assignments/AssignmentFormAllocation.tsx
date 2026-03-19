import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignmentFormAllocationProps } from "@/types/assignment";

export function AssignmentFormAllocation({
  allocationType,
  allocationValue,
  onAllocationTypeChange,
  onAllocationValueChange,
}: AssignmentFormAllocationProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="assignment-alloc-type">Typ alokacji</Label>
        <Select value={allocationType} onValueChange={onAllocationTypeChange}>
          <SelectTrigger id="assignment-alloc-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Procent (%)</SelectItem>
            <SelectItem value="monthly_hours">Godziny / msc</SelectItem>
            <SelectItem value="total_hours">Łączne godziny</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>
          {allocationType === "percentage"
            ? "Wartość (%)"
            : allocationType === "monthly_hours"
            ? "Godziny / msc"
            : "Łączna liczba godzin"}
        </Label>
        <Input
          type="number"
          min="1"
          step={allocationType === "total_hours" ? "any" : "1"}
          value={allocationValue}
          onChange={(e) => onAllocationValueChange(e.target.value)}
          required
        />
      </div>
    </div>
  );
}
