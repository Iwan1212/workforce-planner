import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, subDays } from "date-fns";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DialogWrapper } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCapacity,
  deleteCapacity,
  fetchCapacities,
  updateCapacity,
} from "@/api/employees";
import { CAPACITY_TYPE_OPTIONS, formatCapacity } from "@/lib/capacity";
import { cn } from "@/lib/utils";
import type {
  CapacityDialogProps,
  CapacityInput,
  CapacityType,
  EmployeeCapacity,
} from "@/types/employee";

/**
 * The date the backend backfills as "from always". Showing it verbatim would
 * suggest a 1900 hire date, so it is rendered as an open start instead.
 */
const OPEN_START = "1900-01-01";

function formatDate(value: string): string {
  return format(parseISO(value), "dd.MM.yyyy");
}

/** The last day covered by the period preceding `validFrom`. */
function dayBefore(validFrom: string): string {
  return format(subDays(parseISO(validFrom), 1), "dd.MM.yyyy");
}

/** A period runs until the day before the next one starts. */
function formatRange(
  capacity: EmployeeCapacity,
  next: EmployeeCapacity | undefined,
): string {
  const from =
    capacity.valid_from === OPEN_START
      ? "od zawsze"
      : `od ${formatDate(capacity.valid_from)}`;
  if (!next) return from;
  const until = dayBefore(next.valid_from);
  return capacity.valid_from === OPEN_START
    ? `do ${until}`
    : `${from} do ${until}`;
}

type DraftState = {
  /** null when adding a new period. */
  id: number | null;
  validFrom: string;
  capacityType: CapacityType;
  capacityValue: string;
};

function emptyDraft(): DraftState {
  return {
    id: null,
    // Contract changes almost always take effect from the 1st; never default
    // to a past date, which would silently rewrite closed months.
    validFrom: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    capacityType: "percentage",
    capacityValue: "",
  };
}

function draftFrom(capacity: EmployeeCapacity): DraftState {
  return {
    id: capacity.id,
    validFrom: capacity.valid_from,
    capacityType: capacity.capacity_type,
    capacityValue: String(capacity.capacity_value),
  };
}

export function CapacityDialog({
  open,
  onClose,
  employee,
}: CapacityDialogProps) {
  const queryClient = useQueryClient();
  const employeeId = employee?.id ?? 0;
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeCapacity | null>(
    null,
  );

  const { data: capacities = [], isLoading } = useQuery({
    queryKey: ["capacities", employeeId],
    queryFn: () => fetchCapacities(employeeId),
    enabled: open && employeeId > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["capacities", employeeId] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    // Occupancy is computed from capacity, so both timelines are now stale.
    queryClient.invalidateQueries({ queryKey: ["timeline"] });
    queryClient.invalidateQueries({ queryKey: ["project-timeline"] });
  };

  const saveMutation = useMutation({
    mutationFn: ({ id, data }: { id: number | null; data: CapacityInput }) =>
      id === null
        ? createCapacity(employeeId, data)
        : updateCapacity(employeeId, id, data),
    onSuccess: (_data, variables) => {
      invalidate();
      setDraft(null);
      toast.success(
        variables.id === null ? "Okres dodany" : "Okres zaktualizowany",
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (capacityId: number) => deleteCapacity(employeeId, capacityId),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.success("Okres usunięty");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sorted = useMemo(
    () => [...capacities].sort((a, b) => a.valid_from.localeCompare(b.valid_from)),
    [capacities],
  );

  const leadingGap = sorted.length > 0 && sorted[0].valid_from !== OPEN_START;

  const handleSave = () => {
    if (!draft) return;
    const value = Number(draft.capacityValue.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Podaj wartość większą od zera");
      return;
    }
    saveMutation.mutate({
      id: draft.id,
      data: {
        valid_from: draft.validFrom,
        capacity_type: draft.capacityType,
        capacity_value: value,
      },
    });
  };

  const isLastPeriod = sorted.length === 1;

  return (
    <>
      <DialogWrapper
        open={open}
        onClose={onClose}
        title={
          employee
            ? `Wymiar etatu: ${employee.last_name} ${employee.first_name}`
            : "Wymiar etatu"
        }
        description="Każdy okres obowiązuje od wskazanej daty do początku następnego okresu. Zmiana wielkości etatu wpływa tylko na dany okres, wcześniejsze miesiące zachowują dotychczasowe wyliczenia dla obłożenia i assignmentów."
        contentClassName="max-w-xl"
        footer={
          <Button variant="outline" onClick={onClose}>
            Zamknij
          </Button>
        }
      >
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Wczytywanie...</p>
          ) : (
            <>
              {leadingGap && (
                <div className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  <span>do {dayBefore(sorted[0].valid_from)}</span>
                  <span>Niezatrudniony</span>
                </div>
              )}

              {sorted.map((capacity, index) =>
                draft?.id === capacity.id ? (
                  <ExpandPanel key={capacity.id}>
                    <CapacityEditor
                      draft={draft}
                      onChange={setDraft}
                      onSave={handleSave}
                      onCancel={() => setDraft(null)}
                      isPending={saveMutation.isPending}
                    />
                  </ExpandPanel>
                ) : deleteTarget?.id === capacity.id ? (
                  <ExpandPanel key={capacity.id}>
                    <DeleteConfirm
                      capacity={capacity}
                      isFirst={index === 0}
                      onConfirm={() => deleteMutation.mutate(capacity.id)}
                      onCancel={() => setDeleteTarget(null)}
                      isPending={deleteMutation.isPending}
                    />
                  </ExpandPanel>
                ) : (
                  <div
                    key={capacity.id}
                    className="flex items-center gap-4 rounded-md border px-3 py-2"
                  >
                    {/* Fixed width, wide enough for the longest range, so the
                        badges line up across rows instead of tracking the text. */}
                    <span className="w-[13rem] shrink-0 text-sm">
                      {formatRange(capacity, sorted[index + 1])}
                    </span>
                    <Badge
                      variant={capacity.is_full_time ? "secondary" : "default"}
                    >
                      {formatCapacity(capacity)}
                    </Badge>
                    <div className="ml-auto flex items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDraft(draftFrom(capacity))}
                        aria-label={`Edytuj okres ${formatRange(capacity, sorted[index + 1])}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isLastPeriod}
                        title={
                          isLastPeriod
                            ? "Nie można usunąć jedynego okresu"
                            : undefined
                        }
                        onClick={() => setDeleteTarget(capacity)}
                        aria-label={`Usuń okres ${formatRange(capacity, sorted[index + 1])}`}
                      >
                        <Trash2
                          className={cn(
                            "h-4 w-4",
                            !isLastPeriod && "text-destructive",
                          )}
                        />
                      </Button>
                    </div>
                  </div>
                ),
              )}

              {draft?.id === null ? (
                <ExpandPanel>
                  <CapacityEditor
                    draft={draft}
                    onChange={setDraft}
                    onSave={handleSave}
                    onCancel={() => setDraft(null)}
                    isPending={saveMutation.isPending}
                  />
                </ExpandPanel>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDraft(emptyDraft())}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Dodaj okres
                </Button>
              )}
            </>
          )}
        </div>
      </DialogWrapper>
    </>
  );
}

/**
 * Grows its content to full height on mount instead of snapping the dialog
 * open. `grid-rows` is what makes it work: `height` cannot transition from
 * `auto`, but `0fr` to `1fr` can, so the panel measures itself.
 */
function ExpandPanel({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Next frame, so the browser paints the collapsed state first and has
    // something to animate from.
    const frame = requestAnimationFrame(() => setExpanded(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={cn(
        "grid transition-all duration-200 ease-out",
        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * Confirmation is inline, replacing the row it is about, rather than a second
 * modal: a dialog opened on top of this one renders behind it, and stacking two
 * modals to delete a list row is more ceremony than the action deserves.
 */
function DeleteConfirm({
  capacity,
  isFirst,
  onConfirm,
  onCancel,
  isPending,
}: {
  capacity: EmployeeCapacity;
  isFirst: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
      <p className="text-sm">
        Usunąć okres <strong>{formatCapacity(capacity)}</strong>?
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        <li>
          {isFirst
            ? "Czas przed następnym okresem stanie się okresem bez zatrudnienia."
            : "Poprzedni okres rozszerzy się na ten zakres dat."}
        </li>
        <li>Obłożenie i dostępne godziny w tym zakresie zostaną przeliczone.</li>
      </ul>
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={onConfirm}
          disabled={isPending}
        >
          {isPending ? "Usuwanie..." : "Tak, usuń"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Nie
        </Button>
      </div>
    </div>
  );
}

function CapacityEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  isPending,
}: {
  draft: DraftState;
  onChange: (draft: DraftState) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const isPercentage = draft.capacityType === "percentage";

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      {/* Date and value need only as much room as their content; the rest goes
          to the type select so its longest option is not truncated. */}
      <div className="grid grid-cols-[9rem_1fr_6.5rem] gap-3">
        <div className="space-y-2">
          <Label htmlFor="capacity-valid-from">Obowiązuje od</Label>
          <Input
            id="capacity-valid-from"
            type="date"
            value={draft.validFrom}
            onChange={(e) => onChange({ ...draft, validFrom: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity-type">Typ</Label>
          <Select
            value={draft.capacityType}
            onValueChange={(value) =>
              onChange({ ...draft, capacityType: value as CapacityType })
            }
          >
            <SelectTrigger id="capacity-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAPACITY_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity-value">
            {isPercentage ? "Wartość (%)" : "Godziny / msc"}
          </Label>
          <Input
            id="capacity-value"
            type="number"
            min="0.01"
            max={isPercentage ? "100" : "744"}
            step={isPercentage ? "1" : "0.5"}
            placeholder={isPercentage ? "100" : "40"}
            value={draft.capacityValue}
            onChange={(e) =>
              onChange({ ...draft, capacityValue: e.target.value })
            }
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onSave} disabled={isPending}>
          {isPending ? "Zapisywanie..." : "Zapisz"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </div>
  );
}
