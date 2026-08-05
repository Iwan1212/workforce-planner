import { cn } from "@/lib/utils";

export interface FilterOption {
  id: number;
  name: string;
}

interface FilterChipPanelProps {
  options: FilterOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  isLoading?: boolean;
  emptyLabel?: string;
}

/**
 * Inline panel of toggle chips rendered below the toolbar (like the occupancy
 * panel). Empty selection means "all".
 */
export function FilterChipPanel({
  options,
  selectedIds,
  onChange,
  isLoading,
  emptyLabel = "Brak opcji",
}: FilterChipPanelProps) {
  const toggle = (id: number) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 px-4 py-3">
      {isLoading ? (
        <span className="text-xs text-muted-foreground">Ładowanie...</span>
      ) : options.length === 0 ? (
        <span className="text-xs text-muted-foreground">{emptyLabel}</span>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onChange([])}
            className={cn(
              "inline-flex h-7 items-center rounded-md border px-2 text-xs transition-colors",
              selectedIds.length === 0
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
            aria-pressed={selectedIds.length === 0}
          >
            Wszystkie
          </button>
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              className={cn(
                "inline-flex h-7 items-center rounded-md border px-2 text-xs transition-colors",
                selectedIds.includes(o.id)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={selectedIds.includes(o.id)}
            >
              {o.name}
            </button>
          ))}
        </>
      )}
    </div>
  );
}
