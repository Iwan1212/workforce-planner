import { type SyntheticEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { DialogWrapper } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/PasswordInput";
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
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState("user");

  const isEdit = mode === "edit";
  const isSelf = currentUserId != null && user?.id === currentUserId;

  useEffect(() => {
    if (!open) return;
    if (isEdit && user) {
      setFullName(user.full_name);
      setEmail(user.email);
      setRole(user.role);
      setPassword("");
      setPasswordConfirm("");
    } else {
      setFullName("");
      setEmail("");
      setPassword("");
      setPasswordConfirm("");
      setRole("user");
    }
  }, [open, isEdit, user]);

  const passwordMismatch =
    (password || passwordConfirm) && password !== passwordConfirm;

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (passwordMismatch) {
      toast.error("Hasła nie są identyczne");
      return;
    }

    if (isEdit && user) {
      const data: UserUpdateData = {};
      if (email !== user.email) data.email = email;
      if (fullName !== user.full_name) data.full_name = fullName;
      if (role !== user.role) data.role = role;
      if (password) data.password = password;
      onSubmit(data);
    } else {
      onSubmit({
        email,
        full_name: fullName,
        password,
        role,
      } as UserCreateData);
    }
  };

  const passwordSubmitDisabled = Boolean(
    isEdit
      ? !!password && passwordMismatch
      : !!passwordConfirm && passwordMismatch,
  );

  return (
    <DialogWrapper
      open={open}
      onClose={onClose}
      title={isEdit ? "Edytuj użytkownika" : "Nowy użytkownik"}
      contentClassName="max-w-md"
      form={{
        onSubmit: handleSubmit,
        isSubmitting,
        submitDisabled: passwordSubmitDisabled,
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
          <SelectTrigger id="user-form-role">
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
      <div className="space-y-2">
        <Label htmlFor="user-form-password">
          {isEdit ? "Nowe hasło" : "Hasło"}
        </Label>
        <PasswordInput
          id="user-form-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={
            isEdit ? "Pozostaw puste, aby nie zmieniać" : "Minimum 8 znaków"
          }
          required={!isEdit}
          minLength={isEdit ? undefined : 8}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="user-form-password-confirm">
          {isEdit ? "Powtórz nowe hasło" : "Powtórz hasło"}
        </Label>
        <PasswordInput
          id="user-form-password-confirm"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          placeholder={isEdit ? "Powtórz nowe hasło" : "Powtórz hasło"}
          required={!isEdit}
          minLength={isEdit ? undefined : 8}
        />
        {passwordMismatch && (
          <p className="text-xs text-destructive">Hasła nie są identyczne</p>
        )}
      </div>
    </DialogWrapper>
  );
}
