import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { StickyNote } from "lucide-react";
import type { TimelineAssignment } from "@/api/assignments";

interface TimelineBarProps {
  assignment: TimelineAssignment;
  employeeId: number;
  left: number;
  width: number;
  onClick: () => void;
  onResizeEnd: (
    assignmentId: number,
    edge: "left" | "right",
    deltaPx: number,
  ) => void;
  pxPerDay: number;
  showDailyHours?: boolean;
}

export function TimelineBar({
  assignment,
  employeeId,
  left,
  width,
  onClick,
  onResizeEnd,
  pxPerDay,
  showDailyHours = false,
}: TimelineBarProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `assignment-${assignment.id}`,
      data: { assignment, employeeId },
    });

  const [resizing, setResizing] = useState<"left" | "right" | null>(null);
  const [resizeDelta, setResizeDelta] = useState(0);
  const startXRef = useRef(0);
  const justResizedRef = useRef(false);

  const [noteTooltip, setNoteTooltip] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  // Track active resize listeners for cleanup on unmount
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const hasNote = Boolean(assignment.note && assignment.note.trim());

  const showNoteTooltip = () => {
    if (!hasNote || !iconRef.current) return;
    const rect = iconRef.current.getBoundingClientRect();
    setNoteTooltip({ x: rect.left + rect.width / 2, y: rect.top });
  };

  const hideNoteTooltip = () => {
    setNoteTooltip(null);
  };

  const handleResizeStart = useCallback(
    (e: MouseEvent, edge: "left" | "right") => {
      e.stopPropagation();
      e.preventDefault();
      setResizing(edge);
      setResizeDelta(0);
      startXRef.current = e.clientX;

      const handleMove = (moveEvent: globalThis.MouseEvent) => {
        const dx = moveEvent.clientX - startXRef.current;
        setResizeDelta(dx);
      };

      const cleanup = () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleUp);
        cleanupRef.current = null;
      };

      const handleUp = (upEvent: globalThis.MouseEvent) => {
        const dx = upEvent.clientX - startXRef.current;
        setResizing(null);
        setResizeDelta(0);
        cleanup();

        // Only trigger if moved at least half a day
        if (Math.abs(dx) > pxPerDay * 0.5) {
          onResizeEnd(assignment.id, edge, dx);
        }

        // Prevent click event from opening the modal after resize
        justResizedRef.current = true;
        requestAnimationFrame(() => {
          justResizedRef.current = false;
        });
      };

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleUp);
      cleanupRef.current = cleanup;
    },
    [assignment.id, onResizeEnd, pxPerDay],
  );

  const label =
    assignment.allocation_type === "percentage"
      ? `${assignment.allocation_value}% (${assignment.daily_hours}h/d)`
      : `${assignment.allocation_value}h/m (${assignment.daily_hours}h/d)`;

  // Compute adjusted position during resize
  let adjustedLeft = left;
  let adjustedWidth = width;
  if (resizing === "left") {
    adjustedLeft = left + resizeDelta;
    adjustedWidth = width - resizeDelta;
  } else if (resizing === "right") {
    adjustedWidth = width + resizeDelta;
  }
  adjustedWidth = Math.max(adjustedWidth, 20);

  const style: React.CSSProperties = {
    left: adjustedLeft,
    width: adjustedWidth,
    height: 28,
    backgroundColor: assignment.project_color,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging || resizing ? 50 : 1,
  };

  // Show resize tooltip
  const daysDelta = Math.round(resizeDelta / pxPerDay);
  const showTooltip = resizing && daysDelta !== 0;

  return (
    <div
      ref={setNodeRef}
      className={`absolute top-1 flex items-center overflow-hidden rounded text-xs text-white shadow-sm ${
        resizing ? "" : "cursor-grab transition-opacity hover:opacity-90"
      }`}
      style={style}
      onClick={(e) => {
        if (!isDragging && !resizing && !justResizedRef.current) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-black/20"
        onMouseDown={(e) => handleResizeStart(e, "left")}
      />

      {/* Content - drag handle in the middle */}
      <span className="flex-1 truncate px-2" {...listeners} {...attributes}>
        {showDailyHours
          ? `${assignment.daily_hours}h/d`
          : `${assignment.project_name} · ${label}`}
        {hasNote && (
          <span
            ref={iconRef}
            className="ml-1 inline-flex align-text-bottom"
            onPointerEnter={showNoteTooltip}
            onPointerLeave={hideNoteTooltip}
          >
            <StickyNote size={12} className="opacity-75" />
          </span>
        )}
      </span>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-black/20"
        onMouseDown={(e) => handleResizeStart(e, "right")}
      />

      {/* Resize tooltip */}
      {showTooltip && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-0.5 text-[10px] text-background">
          {daysDelta > 0 ? "+" : ""}
          {daysDelta}d
        </div>
      )}

      {/* Note tooltip via portal - renders outside overflow-hidden */}
      {noteTooltip &&
        hasNote &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] max-w-60 rounded bg-foreground px-2 py-1 text-[11px] leading-tight text-background shadow-lg"
            style={{
              left: noteTooltip.x,
              top: noteTooltip.y - 4,
              transform: "translate(-50%, -100%)",
            }}
          >
            {assignment.note}
          </div>,
          document.body,
        )}
    </div>
  );
}
