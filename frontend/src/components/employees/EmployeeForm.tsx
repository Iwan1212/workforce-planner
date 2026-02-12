import { type FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee } from "@/api/employees";

const TEAMS = [
  "PM",
  "QA",
  "Frontend",
  "Backend",
  "Mobile",
  "UX_UI_Designer",
  "DevOps",
] as const;

const TEAM_LABELS: Record<string, string> = {
  PM: "PM",
  QA: "QA",
  Frontend: "Frontend",
  Backend: "Backend",
  Mobile: "Mobile",
  UX_UI_Designer: "UX/UI Designer",
  DevOps: "DevOps",
};

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    first_name: string;
    last_name: string;
    team: string | null;
  }) => void;
  employee?: Employee | null;
  isSubmitting?: boolean;
}

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

  useEffect(() => {
    if (employee) {
      setFirstName(employee.first_name);
      setLastName(employee.last_name);
      setTeam(employee.team ?? "none");
    } else {
      setFirstName("");
      setLastName("");
      setTeam("none");
    }
  }, [employee, open]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    onSubmit({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      team: team === "none" ? null : team,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {employee ? "Edytuj pracownika" : "Dodaj pracownika"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label>Zespół</Label>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Brak —</SelectItem>
                {TEAMS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TEAM_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { TEAM_LABELS };
