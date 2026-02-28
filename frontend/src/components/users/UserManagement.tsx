import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createUser, deleteUser, fetchUsers, updateUser, type UserListItem } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  required,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={8}
        className="pr-9"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function UserManagement() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; full_name: string } | null>(null);

  // Add form state
  const [addEmail, setAddEmail] = useState("");
  const [addFullName, setAddFullName] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addPasswordConfirm, setAddPasswordConfirm] = useState("");
  const [addRole, setAddRole] = useState("user");

  // Edit form state
  const [editEmail, setEditEmail] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [editPassword, setEditPassword] = useState("");
  const [editPasswordConfirm, setEditPasswordConfirm] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Użytkownik dodany");
      setAddOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof updateUser>[1] }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Użytkownik zaktualizowany");
      setEditTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Użytkownik usunięty");
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpenAdd = () => {
    setAddEmail("");
    setAddFullName("");
    setAddPassword("");
    setAddPasswordConfirm("");
    setAddRole("user");
    setAddOpen(true);
  };

  const handleOpenEdit = (user: UserListItem) => {
    setEditEmail(user.email);
    setEditFullName(user.full_name);
    setEditRole(user.role);
    setEditPassword("");
    setEditPasswordConfirm("");
    setEditTarget(user);
  };

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (addPassword !== addPasswordConfirm) {
      toast.error("Hasła nie są identyczne");
      return;
    }
    createMutation.mutate({ email: addEmail, full_name: addFullName, password: addPassword, role: addRole });
  };

  const handleEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (editPassword && editPassword !== editPasswordConfirm) {
      toast.error("Hasła nie są identyczne");
      return;
    }
    const data: Parameters<typeof updateUser>[1] = {};
    if (editEmail !== editTarget.email) data.email = editEmail;
    if (editFullName !== editTarget.full_name) data.full_name = editFullName;
    if (editRole !== editTarget.role) data.role = editRole;
    if (editPassword) data.password = editPassword;
    updateMutation.mutate({ id: editTarget.id, data });
  };

  const isSelf = (userId: number) => userId === currentUser?.id;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Użytkownicy</h2>
        <Button onClick={handleOpenAdd} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Dodaj użytkownika
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Ładowanie...</p>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Imię i nazwisko</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Rola</th>
                <th className="px-4 py-3 text-left font-medium">Dodano</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {user.full_name}
                    {isSelf(user.id) && (
                      <span className="ml-2 text-xs text-muted-foreground">(ty)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    {user.role === "admin" ? (
                      <Badge variant="default">Admin</Badge>
                    ) : (
                      <Badge variant="secondary">Użytkownik</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString("pl-PL")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!isSelf(user.id) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: user.id, full_name: user.full_name })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    Brak użytkowników
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nowy użytkownik</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-user-name">Imię i nazwisko</Label>
              <Input
                id="add-user-name"
                value={addFullName}
                onChange={(e) => setAddFullName(e.target.value)}
                placeholder="Jan Kowalski"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-email">Email</Label>
              <Input
                id="add-user-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="jan@firma.pl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-password">Hasło</Label>
              <PasswordInput
                id="add-user-password"
                value={addPassword}
                onChange={setAddPassword}
                placeholder="Minimum 8 znaków"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-password-confirm">Powtórz hasło</Label>
              <PasswordInput
                id="add-user-password-confirm"
                value={addPasswordConfirm}
                onChange={setAddPasswordConfirm}
                placeholder="Powtórz hasło"
                required
              />
              {addPasswordConfirm && addPassword !== addPasswordConfirm && (
                <p className="text-xs text-destructive">Hasła nie są identyczne</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-user-role">Rola</Label>
              <Select value={addRole} onValueChange={setAddRole}>
                <SelectTrigger id="add-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Użytkownik</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Anuluj
              </Button>
              <Button type="submit" disabled={createMutation.isPending || (!!addPasswordConfirm && addPassword !== addPasswordConfirm)}>
                {createMutation.isPending ? "Dodawanie..." : "Dodaj"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit user dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edytuj użytkownika</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Imię i nazwisko</Label>
              <Input
                id="edit-user-name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-role">Rola</Label>
              <Select
                value={editRole}
                onValueChange={setEditRole}
                disabled={isSelf(editTarget?.id ?? -1)}
              >
                <SelectTrigger id="edit-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Użytkownik</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {isSelf(editTarget?.id ?? -1) && (
                <p className="text-xs text-muted-foreground">Nie możesz zmienić własnej roli</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-password">Nowe hasło</Label>
              <PasswordInput
                id="edit-user-password"
                value={editPassword}
                onChange={setEditPassword}
                placeholder="Pozostaw puste, aby nie zmieniać"
              />
            </div>
            {editPassword && (
              <div className="space-y-2">
                <Label htmlFor="edit-user-password-confirm">Powtórz nowe hasło</Label>
                <PasswordInput
                  id="edit-user-password-confirm"
                  value={editPasswordConfirm}
                  onChange={setEditPasswordConfirm}
                  placeholder="Powtórz nowe hasło"
                />
                {editPasswordConfirm && editPassword !== editPasswordConfirm && (
                  <p className="text-xs text-destructive">Hasła nie są identyczne</p>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Anuluj
              </Button>
              <Button
                type="submit"
                disabled={
                  updateMutation.isPending ||
                  (!!editPassword && !!editPasswordConfirm && editPassword !== editPasswordConfirm)
                }
              >
                {updateMutation.isPending ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Usuń użytkownika</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Czy na pewno chcesz trwale usunąć użytkownika{" "}
            <span className="font-medium text-foreground">{deleteTarget?.full_name}</span>?
            Osoba ta zostanie wylogowana i straci dostęp do aplikacji.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Anuluj
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending ? "Usuwanie..." : "Usuń"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
