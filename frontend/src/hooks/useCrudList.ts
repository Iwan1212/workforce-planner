import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface UseCrudListConfig<
  TItem extends { id: number },
  TCreateData = unknown,
  TUpdateData = unknown,
> {
  queryKey: string[];
  createMutationFn: (data: TCreateData) => Promise<TItem>;
  updateMutationFn: (params: { id: number; data: TUpdateData }) => Promise<TItem>;
  deleteMutationFn: (id: number) => Promise<unknown>;
  successMessages: { create: string; update: string; delete: string };
}

export function useCrudList<
  TItem extends { id: number },
  TCreateData = unknown,
  TUpdateData = unknown,
>({
  queryKey,
  createMutationFn,
  updateMutationFn,
  deleteMutationFn,
  successMessages,
}: UseCrudListConfig<TItem, TCreateData, TUpdateData>) {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TItem | null>(null);

  const createMutation = useMutation({
    mutationFn: createMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
      toast.success(successMessages.create);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: updateMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setFormOpen(false);
      setEditingItem(null);
      toast.success(successMessages.update);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleteTarget(null);
      toast.success(successMessages.delete);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const openAddForm = useCallback(() => {
    setEditingItem(null);
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingItem(null);
  }, []);

  const handleEdit = useCallback((item: TItem) => {
    setEditingItem(item);
    setFormOpen(true);
  }, []);

  const handleDeleteClick = useCallback((item: TItem) => {
    setDeleteTarget(item);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id);
  }, [deleteTarget, deleteMutation]);

  return {
    formOpen,
    setFormOpen,
    editingItem,
    setEditingItem,
    deleteTarget,
    setDeleteTarget,
    createMutation,
    updateMutation,
    deleteMutation,
    openAddForm,
    closeForm,
    handleEdit,
    handleDeleteClick,
    handleDeleteConfirm,
  };
}
