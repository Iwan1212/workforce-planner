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
import type {
  UserFormDialogProps,
  UserCreateData,
  UserUpdateData,
} from "@/types/user";

export function UserFormDialog({
  open,
  onClose,
  mode,
  user,
  onSubmit,
  isSubmitting,
  currentUserId,
}: UserFormDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");

  const isEdit = mode === "edit";
  const isSelf = currentUserId != null && user?.id === currentUserId;

  useEffect(() => {
    if (!open) return;
    if (isEdit && user) {
      setFullName(user.full_name);
      setEmail(user.email);
      setRole(user.role);
    } else {
      setFullName("");
      setEmail("");
      setRole("user");
    }
  }, [open, isEdit, user]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isEdit && user) {
      const data: UserUpdateData = {};
      if (email !== user.email) data.email = email;
      if (fullName !== user.full_name) data.full_name = fullName;
      if (role !== user.role) data.role = role;
      onSubmit(data);
    } else {
      onSubmit({
        email,
        full_name: fullName,
        role,
      } satisfies UserCreateData);
    }
  };

  return (
    <DialogWrapper
      open={open}
      onClose={onClose}
      title={isEdit ? "Edytuj użytkownika" : "Nowy użytkownik"}
      contentClassName="max-w-md"
      form={{
        onSubmit: handleSubmit,
        isSubmitting,
        submitLabel: isEdit ? "Zapisz" : "Dodaj",
        submittingLabel: isEdit ? "Zapisywanie..." : "Dodawanie...",
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="user-form-name">Imię i nazwisko</Label>
        <Input
          id="user-form-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jan Kowalski"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="user-form-email">Email</Label>
        <Input
          id="user-form-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jan@firma.pl"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="user-form-role">Rola</Label>
        <Select value={role} onValueChange={setRole} disabled={isSelf}>
          <SelectTrigger id="user-form-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Użytkownik</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        {isSelf && (
          <p className="text-xs text-muted-foreground">
            Nie możesz zmienić własnej roli
          </p>
        )}
      </div>
    </DialogWrapper>
  );
}
