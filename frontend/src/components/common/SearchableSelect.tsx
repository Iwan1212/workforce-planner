import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePopoverPanel } from "@/hooks/usePopoverPanel";
import { cn } from "@/lib/utils";

/** Row height in px; rows are single-line, so the list height is predictable. */
const ROW_HEIGHT = 32;
const MAX_LIST_HEIGHT = 288;
/** Search input plus the panel's own padding, on top of the list height. */
const SEARCH_BOX_HEIGHT = 54;

export interface SearchableSelectOption {
  value: string;
  /** Plain text used for searching and as the trigger label fallback. */
  label: string;
  /** Custom rendering for the row and the trigger (e.g. a project color dot). */
  content?: ReactNode;
  /** Muted suffix shown after the label, e.g. "(zarchiwizowany)". */
  hint?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  /** Rendered on the trigger, for tests and for focusing the field. */
  id?: string;
  /**
   * Id of the field's <Label>. Deliberately not wired with `htmlFor`: the browser
   * forwards a label click to the labelled control, which would immediately
   * reopen the panel that the same click just dismissed.
   */
  labelId?: string;
  invalid?: boolean;
  className?: string;
}

/**
 * Single-choice dropdown with a search box, for lists too long to scan by eye
 * (employees, projects, teams). Visually matches the plain Select trigger.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Wybierz...",
  searchPlaceholder = "Szukaj...",
  isLoading,
  emptyLabel = "Brak opcji",
  disabled,
  id,
  labelId,
  invalid,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const { triggerRef, container, side, preparePanel } = usePopoverPanel();

  /** Height of the panel with nothing filtered out; decides where it opens. */
  const panelHeight =
    Math.min(Math.max(options.length, 1) * ROW_HEIGHT, MAX_LIST_HEIGHT) +
    SEARCH_BOX_HEIGHT;

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? options.filter((o) => o.label.toLowerCase().includes(q))
      : options;
  }, [options, search]);

  // Derived, so filtering the list can never leave the highlight past its end.
  const activeIndex = Math.min(highlight, Math.max(filtered.length - 1, 0));

  // Deferred by a frame: right after opening, Radix has not positioned the panel
  // yet, and scrolling an unlaid-out box does nothing.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector('[data-highlighted="true"]')
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, open]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      preparePanel(panelHeight);
      setSearch("");
      const index = options.findIndex((o) => o.value === value);
      setHighlight(index === -1 ? 0 : index);
    }
  };

  const select = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlight((activeIndex + step + filtered.length) % filtered.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[activeIndex];
      if (option) select(option.value);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        ref={triggerRef}
        id={id}
        disabled={disabled}
        aria-labelledby={labelId}
        aria-invalid={invalid}
        className={cn(
          "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selected ? (
            <>
              {selected.content ?? selected.label}
              {selected.hint && (
                <span className="text-xs text-muted-foreground">
                  {selected.hint}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              {isLoading ? "Ładowanie..." : placeholder}
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>

      <PopoverContent
        container={container}
        side={side}
        className="flex max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) flex-col p-1"
      >
        <input
          autoFocus
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="mb-1 w-full shrink-0 rounded-sm border-b bg-transparent px-2 py-1.5 text-sm outline-none"
        />
        <div
          ref={listRef}
          className="min-h-0 max-h-72 flex-1 overflow-y-auto"
        >
          {isLoading ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Ładowanie...
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              {options.length === 0 ? emptyLabel : "Brak wyników"}
            </p>
          ) : (
            filtered.map((option, index) => (
              <button
                key={option.value}
                type="button"
                data-highlighted={index === highlight}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => select(option.value)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm data-[highlighted=true]:bg-accent data-[highlighted=true]:text-accent-foreground"
              >
                <Check
                  className={cn(
                    "size-4 shrink-0",
                    option.value === value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1 truncate">
                  {option.content ?? option.label}
                </span>
                {option.hint && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {option.hint}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
