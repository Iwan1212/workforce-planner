import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createUser, deleteUser, updateUser } from "@/api/users";
import type { UserListItem } from "@/types/user";

type DeleteTarget = { id: number; full_name: string };

export function useUserCrud() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

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

  const openAddForm = useCallback(() => setAddOpen(true), []);
  const handleEdit = useCallback((user: UserListItem) => setEditTarget(user), []);
  const handleDeleteClick = useCallback((user: UserListItem) => {
    setDeleteTarget({ id: user.id, full_name: user.full_name });
  }, []);
  const handleDeleteConfirm = useCallback(() => {
    if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
  }, [deleteTarget, deleteMutation]);

  return {
    addOpen,
    setAddOpen,
    editTarget,
    setEditTarget,
    deleteTarget,
    setDeleteTarget,
    createMutation,
    updateMutation,
    deleteMutation,
    openAddForm,
    handleEdit,
    handleDeleteClick,
    handleDeleteConfirm,
  };
}
