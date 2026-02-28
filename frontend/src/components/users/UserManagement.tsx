import { type FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
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
import { createUser, deleteUser, fetchUsers } from "@/api/users";
import { useAuthStore } from "@/stores/authStore";

export function UserManagement() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; full_name: string } | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");

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
    setEmail("");
    setFullName("");
    setPassword("");
    setRole("user");
    setAddOpen(true);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ email, full_name: fullName, password, role });
  };

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
                  <td className="px-4 py-3 font-medium">{user.full_name}</td>
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
                  <td className="px-4 py-3 text-right">
                    {user.id !== currentUser?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: user.id, full_name: user.full_name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Imię i nazwisko</Label>
              <Input
                id="user-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jan Kowalski"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jan@firma.pl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Hasło</Label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 znaków"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Rola</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="user-role">
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Dodawanie..." : "Dodaj"}
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
