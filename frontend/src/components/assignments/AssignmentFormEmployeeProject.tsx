import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignmentFormEmployeeProjectProps } from "@/types/assignment";

export function AssignmentFormEmployeeProject({
  employeeId,
  projectId,
  onEmployeeChange,
  onProjectChange,
  employees,
  projects,
  employeeError,
}: AssignmentFormEmployeeProjectProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="assignment-employee">Pracownik</Label>
        <Select value={employeeId} onValueChange={onEmployeeChange}>
          <SelectTrigger
            id="assignment-employee"
            className="w-full"
            aria-invalid={!!employeeError}
          >
            <SelectValue placeholder="Wybierz pracownika" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              — Nieprzypisane (placeholder) —
            </SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={String(emp.id)}>
                {emp.last_name} {emp.first_name}
                {emp.is_archived && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (zarchiwizowany)
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {employeeError && (
          <p className="text-sm text-destructive" role="alert">
            {employeeError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignment-project">Projekt</Label>
        <Select value={projectId} onValueChange={onProjectChange}>
          <SelectTrigger id="assignment-project" className="w-full">
            <SelectValue placeholder="Wybierz projekt" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((proj) => (
              <SelectItem key={proj.id} value={String(proj.id)}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: proj.color }}
                  />
                  {proj.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
