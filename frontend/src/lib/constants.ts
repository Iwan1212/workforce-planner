export const ALL_TEAMS = [
  "BA",
  "Backend",
  "DevOps",
  "Frontend",
  "ML",
  "Mobile",
  "PM",
  "QA",
  "UX_UI_Designer",
] as const;

export const TEAM_LABELS: Record<string, string> = {
  BA: "BA",
  Backend: "Backend",
  DevOps: "DevOps",
  Frontend: "Frontend",
  ML: "ML",
  Mobile: "Mobile",
  PM: "PM",
  QA: "QA",
  UX_UI_Designer: "UX/UI",
};

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  urlop: "Urlop",
  chorobowe: "Chorobowe",
  inne: "Nieobecność",
};

export function getUtilColor(pct: number): string {
  if (pct > 100) return "text-red-600 font-bold";
  if (pct > 80) return "text-yellow-600";
  if (pct > 0) return "text-green-600";
  return "text-muted-foreground";
}

export const TIMELINE_LEFT_PANEL_WIDTH = 250;