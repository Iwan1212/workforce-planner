import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  id: number;
  name: string;
}

interface MultiSelectFieldProps {
  options: MultiSelectOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  emptyLabel?: string;
}

/**
 * Form field for selecting many options: shows chosen items as removable tags
 * and a searchable dropdown to toggle options. Used for employee technologies.
 */
export function MultiSelectField({
  options,
  selectedIds,
  onChange,
  placeholder = "Wybierz...",
  isLoading,
  emptyLabel = "Brak opcji",
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedOptions = useMemo(
    () => options.filter((o) => selectedIds.includes(o.id)),
    [options, selectedIds],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const toggle = (id: number) =>
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-left text-sm shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {selectedOptions.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          selectedOptions.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground"
            >
              {o.name}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(o.id);
                }}
                className="rounded-full hover:bg-muted-foreground/20"
                aria-label={`Usuń ${o.name}`}
              >
                <X className="h-3 w-3" />
              </span>
            </span>
          ))
        )}
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded-md border bg-background p-1 shadow-md">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj..."
            className="mb-1 w-full rounded-sm border-b bg-transparent px-2 py-1.5 text-sm outline-none"
          />
          <div className="max-h-48 overflow-y-auto">
            {isLoading ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                Ładowanie...
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                {options.length === 0 ? emptyLabel : "Brak wyników"}
              </p>
            ) : (
              filtered.map((o) => {
                const isSelected = selectedIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggle(o.id)}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    {o.name}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
