import { type SyntheticEvent, useEffect, useState } from "react";
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
import { ALL_TEAMS, TEAM_LABELS } from "@/lib/constants";
import type { EmployeeFormProps } from "@/types/employee";

export function EmployeeForm({
  open,
  onClose,
  onSubmit,
  employee,
  isSubmitting,
}: EmployeeFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [team, setTeam] = useState<string>("none");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (employee) {
      setFirstName(employee.first_name);
      setLastName(employee.last_name);
      setTeam(employee.team ?? "none");
      setEmail(employee.email ?? "");
    } else {
      setFirstName("");
      setLastName("");
      setTeam("none");
      setEmail("");
    }
  }, [employee, open]);

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      team: team === "none" ? null : team,
      email: email.trim() || null,
    });
  };

  return (
    <DialogWrapper
      open={open}
      onClose={onClose}
      title={employee ? "Edytuj pracownika" : "Dodaj pracownika"}
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
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Nazwisko</Label>
        <Input
          id="lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="jan.kowalski@firma.pl"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Email do synchronizacji urlopów z Calamari
        </p>
      </div>
      <div className="space-y-2">
        <Label>Zespół</Label>
        <Select value={team} onValueChange={setTeam}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Brak —</SelectItem>
            {ALL_TEAMS.map((t) => (
              <SelectItem key={t} value={t}>
                {TEAM_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </DialogWrapper>
  );
}
