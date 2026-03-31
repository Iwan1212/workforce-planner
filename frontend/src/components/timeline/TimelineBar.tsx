import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { addDays, format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";
import { CircleHelp, StickyNote } from "lucide-react";
import type { TimelineBarProps } from "@/types/timeline";
import { getContrastTextClass } from "@/lib/utils";
import { TIMELINE_LEFT_PANEL_WIDTH } from "@/lib/constants";

export function TimelineBar({
  assignment,
  employeeId,
  left,
  width,
  onClick,
  onResizeEnd,
  pxPerDay,
  showDailyHours = false,
  readOnly = false,
  showResizeDateTooltip = false,
  showResizeLeft = true,
  showResizeRight = true,
}: TimelineBarProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `assignment-${assignment.id}`,
      data: { assignment, employeeId },
      disabled: readOnly,
    });

  const [resizing, setResizing] = useState<"left" | "right" | null>(null);
  const [resizeDelta, setResizeDelta] = useState(0);
  const [resizeTooltipPos, setResizeTooltipPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const startXRef = useRef(0);
  const resizeTooltipYRef = useRef(0);
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
      resizeTooltipYRef.current = e.clientY;
      setResizeTooltipPos({ x: e.clientX, y: e.clientY });
      startXRef.current = e.clientX;

      const handleMove = (moveEvent: globalThis.MouseEvent) => {
        const dx = moveEvent.clientX - startXRef.current;
        setResizeDelta(dx);
        setResizeTooltipPos({
          x: moveEvent.clientX,
          y: resizeTooltipYRef.current,
        });
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
        setResizeTooltipPos(null);
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
      : assignment.allocation_type === "monthly_hours"
        ? `${assignment.allocation_value}h/m (${assignment.daily_hours}h/d)`
        : `${assignment.allocation_value}h tot. (${assignment.daily_hours}h/d)`;

  const textColorClass = assignment.is_tentative
    ? ""
    : getContrastTextClass(assignment.project_color);

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

  const style: React.CSSProperties = assignment.is_tentative
    ? {
        left: adjustedLeft,
        width: adjustedWidth,
        height: 28,
        color: assignment.project_color,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging || resizing ? 50 : 1,
      }
    : {
        left: adjustedLeft,
        width: adjustedWidth,
        height: 28,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging || resizing ? 50 : 1,
      };

  const barFillStyle: React.CSSProperties = assignment.is_tentative
    ? {
        backgroundColor: "var(--background)",
        border: `2px solid ${assignment.project_color}`,
      }
    : { backgroundColor: assignment.project_color };

  const daysDelta = Math.round(resizeDelta / pxPerDay);
  const resizeTooltipDate = useMemo(() => {
    if (!resizing) return null;
    if (resizing === "left") {
      const start = parseISO(assignment.start_date);
      return format(addDays(start, daysDelta), "d.MM.yyyy", { locale: pl });
    }
    const end = parseISO(assignment.end_date);
    return format(addDays(end, daysDelta), "d.MM.yyyy", { locale: pl });
  }, [resizing, assignment.start_date, assignment.end_date, daysDelta]);
  const showTooltip = showResizeDateTooltip && resizing !== null;

  return (
    <div
      ref={setNodeRef}
      className={`absolute top-0 flex items-center rounded text-xs ${textColorClass} shadow-sm ${
        readOnly
          ? "cursor-default"
          : resizing
            ? ""
            : "cursor-grab transition-opacity hover:opacity-90"
      }`}
      style={style}
      onClick={(e) => {
        if (!readOnly && !isDragging && !resizing && !justResizedRef.current) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded"
        style={barFillStyle}
        aria-hidden
      />
      {/* Left resize handle */}
      {!readOnly && showResizeLeft && (
        <div
          className="absolute left-0 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-black/20"
          onMouseDown={(e) => handleResizeStart(e, "left")}
        />
      )}

      {/* Content - drag handle in the middle */}
      <span
        className="relative z-1 flex min-w-0 flex-1 items-center px-2"
        {...listeners}
        {...attributes}
      >
        <span
          className="flex min-w-0 max-w-full items-center gap-1 rounded-sm px-1 py-px"
          style={{
            position: "sticky",
            left: TIMELINE_LEFT_PANEL_WIDTH,
            top: 0,
            backgroundColor: assignment.is_tentative
              ? "var(--background)"
              : assignment.project_color,
          }}
        >
          <span className="min-w-0 flex-1 truncate">
            {showDailyHours
              ? `${assignment.project_name} (${assignment.daily_hours}h/d)`
              : `${assignment.project_name} · ${label}`}
          </span>
          {assignment.is_tentative && (
            <CircleHelp size={12} className="shrink-0 opacity-75" />
          )}
          {hasNote && (
            <span
              ref={iconRef}
              className="inline-flex shrink-0 align-text-bottom"
              onPointerEnter={showNoteTooltip}
              onPointerLeave={hideNoteTooltip}
            >
              <StickyNote size={12} className="opacity-75" />
            </span>
          )}
        </span>
      </span>

      {/* Right resize handle */}
      {!readOnly && showResizeRight && (
        <div
          className="absolute right-0 top-0 z-10 h-full w-2 cursor-col-resize hover:bg-black/20"
          onMouseDown={(e) => handleResizeStart(e, "right")}
        />
      )}

      {showTooltip &&
        resizeTooltipDate &&
        resizeTooltipPos &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs text-background shadow-lg"
            style={{
              left: resizeTooltipPos.x,
              top: resizeTooltipPos.y - 8,
              transform: "translate(-50%, -100%)",
            }}
          >
            {resizeTooltipDate}
          </div>,
          document.body,
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
