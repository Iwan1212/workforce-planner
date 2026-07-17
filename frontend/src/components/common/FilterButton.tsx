import { ChevronDown, ChevronUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterButtonProps {
  label: string;
  icon?: LucideIcon;
  /** Number of active selections; shown as a small badge when > 0. */
  count?: number;
  /** Whether the filter currently has a selection (drives the "active" style). */
  active?: boolean;
  /** Whether this filter's panel is currently expanded. */
  open?: boolean;
  onClick: () => void;
}

/** Toolbar toggle button for an expandable filter panel (matches "Obłożenie"). */
export function FilterButton({
  label,
  icon: Icon,
  count = 0,
  active,
  open,
  onClick,
}: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : open
            ? "bg-muted"
            : "text-muted-foreground hover:bg-muted",
      )}
      aria-pressed={open}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      {count > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 text-[10px] font-medium tabular-nums",
            active ? "bg-primary-foreground/20" : "bg-muted-foreground/20",
          )}
        >
          {count}
        </span>
      )}
      {open ? (
        <ChevronUp className="h-3 w-3" />
      ) : (
        <ChevronDown className="h-3 w-3" />
      )}
    </button>
  );
}
