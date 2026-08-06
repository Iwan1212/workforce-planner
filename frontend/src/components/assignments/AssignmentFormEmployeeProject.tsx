import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/common/SearchableSelect";
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
  const employeeOptions = useMemo(
    () => [
      { value: "none", label: "— Nieprzypisane (placeholder) —" },
      ...employees.map((emp) => ({
        value: String(emp.id),
        label: `${emp.last_name} ${emp.first_name}`,
        hint: emp.is_archived ? "(zarchiwizowany)" : undefined,
      })),
    ],
    [employees],
  );

  const projectOptions = useMemo(
    () =>
      projects.map((proj) => ({
        value: String(proj.id),
        label: proj.name,
        content: (
          <span className="flex items-center gap-2 truncate">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-border"
              style={{ backgroundColor: proj.color }}
            />
            <span className="truncate">{proj.name}</span>
          </span>
        ),
      })),
    [projects],
  );

  return (
    <>
      <div className="space-y-2">
        <Label id="assignment-employee-label">Pracownik</Label>
        <SearchableSelect
          id="assignment-employee"
          labelId="assignment-employee-label"
          options={employeeOptions}
          value={employeeId}
          onChange={onEmployeeChange}
          placeholder="Wybierz pracownika"
          searchPlaceholder="Szukaj pracownika..."
          invalid={!!employeeError}
        />
        {employeeError && (
          <p className="text-sm text-destructive" role="alert">
            {employeeError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label id="assignment-project-label">Projekt</Label>
        <SearchableSelect
          id="assignment-project"
          labelId="assignment-project-label"
          options={projectOptions}
          value={projectId}
          onChange={onProjectChange}
          placeholder="Wybierz projekt"
          searchPlaceholder="Szukaj projektu..."
        />
      </div>
    </>
  );
}
