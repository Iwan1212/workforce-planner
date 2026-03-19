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
}: AssignmentFormEmployeeProjectProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="assignment-employee">Pracownik</Label>
        <Select value={employeeId} onValueChange={onEmployeeChange}>
          <SelectTrigger id="assignment-employee">
            <SelectValue placeholder="Wybierz pracownika" />
          </SelectTrigger>
          <SelectContent>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={String(emp.id)}>
                {emp.last_name} {emp.first_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assignment-project">Projekt</Label>
        <Select value={projectId} onValueChange={onProjectChange}>
          <SelectTrigger id="assignment-project">
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
