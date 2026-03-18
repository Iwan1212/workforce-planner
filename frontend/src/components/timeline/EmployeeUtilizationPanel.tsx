import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  TimelineEmployee,
  TimelineAssignment,
  MonthUtilization,
} from "@/api/assignments";

interface EmployeeUtilizationPanelProps {
  employee: TimelineEmployee;
  months: { key: string; year: number; month: number }[];
  onClose: () => void;
  onEditAssignment: (assignment: TimelineAssignment) => void;
}

const MONTH_NAMES = [
  "",
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

function getStatusBadge(pct: number) {
  if (pct > 100)
    return (
      <Badge variant="destructive" className="text-[10px]">
        Przekroczony
      </Badge>
    );
  if (pct > 80)
    return (
      <Badge className="bg-green-100 text-green-800 text-[10px]">OK</Badge>
    );
  if (pct > 0)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">
        Niski
      </Badge>
    );
  return (
    <Badge variant="secondary" className="text-[10px]">
      Brak
    </Badge>
  );
}

function UtilBar({ pct }: { pct: number }) {
  const width = Math.min(pct, 150);
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all ${
          pct > 100 ? "bg-red-500" : pct > 80 ? "bg-green-500" : "bg-yellow-500"
        }`}
        style={{ width: `${Math.min(width, 100)}%` }}
      />
    </div>
  );
}

export function EmployeeUtilizationPanel({
  employee,
  months,
  onClose,
  onEditAssignment,
}: EmployeeUtilizationPanelProps) {
  // Group assignments by project
  const projectGroups = useMemo(() => {
    const groups = new Map<
      number,
      { name: string; color: string; assignments: TimelineAssignment[] }
    >();

    for (const a of employee.assignments) {
      if (!groups.has(a.project_id)) {
        groups.set(a.project_id, {
          name: a.project_name,
          color: a.project_color,
          assignments: [],
        });
      }
      groups.get(a.project_id)!.assignments.push(a);
    }

    return Array.from(groups.values());
  }, [employee.assignments]);

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-lg font-semibold">{employee.name}</h3>
          {employee.team && (
            <Badge variant="secondary" className="mt-0.5">
              {employee.team}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Monthly breakdown */}
        <div className="border-b p-4">
          <h4 className="mb-3 text-sm font-medium">Obciążenie miesięczne</h4>
          <div className="space-y-2">
            {months.map((m) => {
              const u: MonthUtilization | undefined =
                employee.utilization[m.key];
              const pct = u ? Math.round(u.percentage) : 0;
              const hours = u ? Math.round(u.hours) : 0;
              const available = u ? Math.round(u.available_hours) : 0;

              return (
                <div key={m.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">
                      {MONTH_NAMES[m.month]} {m.year}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {hours}h / {available}h
                      </span>
                      <span className="font-medium">{pct}%</span>
                      {getStatusBadge(pct)}
                    </span>
                  </div>
                  <UtilBar pct={pct} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Assignment list grouped by project */}
        <div className="p-4">
          <h4 className="mb-3 text-sm font-medium">Assignmenty</h4>
          {projectGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Brak przypisań w tym zakresie dat.
            </p>
          ) : (
            <div className="space-y-4">
              {projectGroups.map((group) => (
                <div key={group.name}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="text-sm font-medium">{group.name}</span>
                  </div>
                  <div className="space-y-1 pl-5">
                    {group.assignments.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-muted"
                      >
                        <div>
                          <span>
                            {a.start_date} — {a.end_date}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {a.allocation_type === "percentage"
                              ? `${a.allocation_value}%`
                              : a.allocation_type === "total_hours"
                              ? `${a.allocation_value}h tot.`
                              : `${a.allocation_value}h/msc`}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => onEditAssignment(a)}
                        >
                          Edytuj
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
