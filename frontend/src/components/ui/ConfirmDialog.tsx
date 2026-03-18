import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConfirmDialogProps } from "@/types/ui";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Potwierdź",
  cancelLabel = "Anuluj",
  pendingLabel,
  variant = "default",
  onConfirm,
  isPending = false,
  contentClassName,
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-sm", contentClassName)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {typeof description === "string" ? (
          <DialogDescription>{description}</DialogDescription>
        ) : (
          <DialogDescription asChild>
            <div className="text-muted-foreground">{description}</div>
          </DialogDescription>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? "destructive" : "default"}
            onClick={() => onConfirm()}
            disabled={isPending}
          >
            {isPending ? (pendingLabel ?? "...") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
