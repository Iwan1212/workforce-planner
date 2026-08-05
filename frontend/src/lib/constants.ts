export const LEAVE_TYPE_LABELS: Record<string, string> = {
  urlop: "Urlop",
  chorobowe: "Chorobowe",
  inne: "Nieobecność",
};

export function getUtilColor(pct: number): string {
  if (pct > 100) return "text-red-600";
  if (pct > 80) return "text-yellow-600";
  if (pct > 0) return "text-green-600";
  return "text-muted-foreground";
}

export const TIMELINE_LEFT_PANEL_WIDTH = 250;