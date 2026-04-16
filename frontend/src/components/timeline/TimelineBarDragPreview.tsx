import { CircleHelp, StickyNote } from "lucide-react";
import type { TimelineAssignment } from "@/types/assignment";
import { getContrastTextClass } from "@/lib/utils";

type TimelineBarDragPreviewProps = {
  assignment: TimelineAssignment;
  width: number;
  showDailyHours: boolean;
};

/** Visual clone for DragOverlay; the real bar stays in-flow without transform. */
export function TimelineBarDragPreview({
  assignment,
  width,
  showDailyHours,
}: TimelineBarDragPreviewProps) {
  const label =
    assignment.allocation_type === "percentage"
      ? `${assignment.allocation_value}% (${assignment.daily_hours}h/d)`
      : assignment.allocation_type === "monthly_hours"
        ? `${assignment.allocation_value}h/m (${assignment.daily_hours}h/d)`
        : `${assignment.allocation_value}h tot. (${assignment.daily_hours}h/d)`;

  const textColorClass = assignment.is_tentative
    ? ""
    : getContrastTextClass(assignment.project_color);

  const barFillStyle = assignment.is_tentative
    ? {
        backgroundColor: "var(--background)",
        border: `2px solid ${assignment.project_color}`,
      }
    : { backgroundColor: assignment.project_color };

  const hasNote = Boolean(assignment.note && assignment.note.trim());

  return (
    <div
      className={`flex items-center rounded text-xs shadow-md ring-2 ring-black/10 ${textColorClass}`}
      style={{
        width: Math.max(width, 20),
        height: 28,
        position: "relative",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded"
        style={barFillStyle}
        aria-hidden
      />
      <span className="relative z-1 flex min-w-0 flex-1 items-center px-2">
        <span
          className="flex min-w-0 max-w-full items-center gap-1 truncate rounded-sm px-1 py-px"
          style={{
            backgroundColor: assignment.is_tentative
              ? "var(--background)"
              : assignment.project_color,
          }}
        >
          <span className="min-w-0 flex-1 truncate">
            {showDailyHours
              ? `${assignment.project_name} · (${assignment.daily_hours}h/d)`
              : `${assignment.project_name} · ${label}`}
          </span>
          {assignment.is_tentative && (
            <CircleHelp size={12} className="shrink-0 opacity-75" />
          )}
          {hasNote && (
            <span className="inline-flex shrink-0 align-text-bottom">
              <StickyNote size={12} className="opacity-75" />
            </span>
          )}
        </span>
      </span>
    </div>
  );
}
