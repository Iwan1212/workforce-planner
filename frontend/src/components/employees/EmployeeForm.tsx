import { type FormEvent, useEffect, useState } from "react";
import { DialogWrapper } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelectField } from "@/components/common/MultiSelectField";
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
        <Label>Zespół</Label>
        <Select
          value={form.teamId}
          onValueChange={(v) => setForm((f) => ({ ...f, teamId: v }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={teamsLoading ? "Ładowanie..." : undefined} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Brak —</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Technologie</Label>
        <MultiSelectField
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
