import { type FormEvent, useEffect, useMemo, useState } from "react";
import { DialogWrapper } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelectField } from "@/components/common/MultiSelectField";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useTeams } from "@/hooks/useTeams";
import { useTechnologies } from "@/hooks/useTechnologies";
import type { Employee, EmployeeFormProps } from "@/types/employee";

function initialFormState(employee: Employee | null | undefined) {
  if (!employee) {
    return {
      firstName: "",
      lastName: "",
      teamId: "none",
      technologyIds: [] as number[],
      email: "",
    };
  }
  return {
    firstName: employee.first_name,
    lastName: employee.last_name,
    teamId: employee.team ? String(employee.team.id) : "none",
    technologyIds: employee.technologies.map((t) => t.id),
    email: employee.email ?? "",
  };
}

export function EmployeeForm({
  open,
  onClose,
  onSubmit,
  employee,
  isSubmitting,
}: EmployeeFormProps) {
  const [form, setForm] = useState(() => initialFormState(employee));
  const { data: teams = [], isLoading: teamsLoading } = useTeams();
  const { data: technologies = [], isLoading: technologiesLoading } =
    useTechnologies();

  useEffect(() => {
    setForm(initialFormState(employee));
  }, [employee]);

  const teamOptions = useMemo(
    () => [
      { value: "none", label: "— Brak —" },
      ...teams.map((t) => ({ value: String(t.id), label: t.name })),
    ],
    [teams],
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    onSubmit({
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      team_id: form.teamId === "none" ? null : Number(form.teamId),
      technology_ids: form.technologyIds,
      email: form.email.trim() || null,
    });
  };

  return (
    <DialogWrapper
      open={open}
      onClose={onClose}
      title={employee ? "Edytuj pracownika" : "Nowy pracownik"}
      form={{
        onSubmit: handleSubmit,
        isSubmitting,
        submitLabel: "Zapisz",
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="firstName">Imię</Label>
        <Input
          id="firstName"
          value={form.firstName}
          onChange={(e) =>
            setForm((f) => ({ ...f, firstName: e.target.value }))
          }
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Nazwisko</Label>
        <Input
          id="lastName"
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="jan.kowalski@firma.pl"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          Email do synchronizacji urlopów z Calamari
        </p>
      </div>
      <div className="space-y-2">
        <Label id="employee-team-label">Zespół</Label>
        <SearchableSelect
          id="employee-team"
          labelId="employee-team-label"
          options={teamOptions}
          value={form.teamId}
          onChange={(v) => setForm((f) => ({ ...f, teamId: v }))}
          isLoading={teamsLoading}
          searchPlaceholder="Szukaj zespołu..."
          emptyLabel="Brak zespołów. Dodaj je w Ustawieniach"
        />
      </div>
      <div className="space-y-2">
        <Label id="employee-technologies-label">Technologie</Label>
        <MultiSelectField
          labelId="employee-technologies-label"
          options={technologies}
          selectedIds={form.technologyIds}
          onChange={(ids) => setForm((f) => ({ ...f, technologyIds: ids }))}
          placeholder="Wybierz technologie..."
          isLoading={technologiesLoading}
          emptyLabel="Brak technologii. Dodaj je w Ustawieniach"
        />
      </div>
    </DialogWrapper>
  );
}
