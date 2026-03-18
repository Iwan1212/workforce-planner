import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/types/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery } from "@tanstack/react-query";
import { fetchUsers } from "@/api/users";
import type {
  UserListItem,
  UserCreateData,
  UserUpdateData,
} from "@/types/user";
import { useAuthStore } from "@/stores/authStore";
import { useUserCrud } from "@/hooks/useUserCrud";
import { UserFormDialog } from "./UserFormDialog";

function getUserColumns(currentUserId: number | undefined): DataTableColumn<UserListItem>[] {
  return [
    {
      id: "full_name",
      header: "Imię i nazwisko",
      cell: (user) => (
        <span className="font-medium">
          {user.full_name}
          {currentUserId === user.id && (
            <span className="ml-2 text-xs text-muted-foreground">(ty)</span>
          )}
        </span>
      ),
    },
    {
      id: "email",
      header: "Email",
      cell: (user) => (
        <span className="text-muted-foreground">{user.email}</span>
      ),
    },
    {
      id: "role",
      header: "Rola",
      cell: (user) =>
        user.role === "admin" ? (
          <Badge variant="default">Admin</Badge>
        ) : user.role === "viewer" ? (
          <Badge variant="outline">Viewer</Badge>
        ) : (
          <Badge variant="secondary">Użytkownik</Badge>
        ),
    },
    {
      id: "created_at",
      header: "Dodano",
      cell: (user) => (
        <span className="text-muted-foreground">
          {new Date(user.created_at).toLocaleDateString("pl-PL")}
        </span>
      ),
    },
  ];
}

export function UserManagement() {
  const currentUser = useAuthStore((s) => s.user);
  const crud = useUserCrud();
  const userColumns = getUserColumns(currentUser?.id);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const handleAddSubmit = (data: UserCreateData | UserUpdateData) => {
    crud.createMutation.mutate(data as UserCreateData);
  };

  const handleEditSubmit = (
    data: Parameters<typeof crud.updateMutation.mutate>[0]["data"]
  ) => {
    if (crud.editTarget) {
      crud.updateMutation.mutate({ id: crud.editTarget.id, data });
    }
  };

  const isSelf = (userId: number) => userId === currentUser?.id;

  return (
    <div className="p-6">
      <PageHeader
        title="Użytkownicy"
        action={
          <Button onClick={crud.openAddForm}>
            <Plus className="mr-2 h-4 w-4" />
            Dodaj użytkownika
          </Button>
        }
      />

      <DataTable<UserListItem>
        data={users}
        columns={userColumns}
        getRowKey={(user) => user.id}
        renderActions={(user) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => crud.handleEdit(user)}
              aria-label={`Edytuj ${user.full_name}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {!isSelf(user.id) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => crud.handleDeleteClick(user)}
                aria-label={`Usuń ${user.full_name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
        isLoading={isLoading}
        emptyContent="Brak użytkowników"
      />

      <UserFormDialog
        open={crud.addOpen}
        onClose={() => crud.setAddOpen(false)}
        mode="add"
        onSubmit={handleAddSubmit}
        isSubmitting={crud.createMutation.isPending}
        currentUserId={currentUser?.id}
      />

      <UserFormDialog
        open={crud.editTarget !== null}
        onClose={() => crud.setEditTarget(null)}
        mode="edit"
        user={crud.editTarget}
        onSubmit={handleEditSubmit}
        isSubmitting={crud.updateMutation.isPending}
        currentUserId={currentUser?.id}
      />

      <ConfirmDialog
        open={crud.deleteTarget !== null}
        onOpenChange={(o) => !o && crud.setDeleteTarget(null)}
        title="Usuń użytkownika"
        description={
          crud.deleteTarget ? (
            <>
              Czy na pewno chcesz trwale usunąć użytkownika{" "}
              <span className="font-medium text-foreground">
                {crud.deleteTarget.full_name}
              </span>
              ? Osoba ta zostanie wylogowana i straci dostęp do aplikacji.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Usuń"
        pendingLabel="Usuwanie..."
        variant="destructive"
        onConfirm={crud.handleDeleteConfirm}
        isPending={crud.deleteMutation.isPending}
      />
    </div>
  );
}
