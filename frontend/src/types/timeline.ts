import type {
  TimelineAssignment,
  TimelineEmployee,
  MonthUtilization,
  VacationInfo,
} from "./assignment";

export type ViewMode = "monthly" | "weekly";

export interface UtilizationFilter {
  dateFrom: string | null;
  dateTo: string | null;
  minPct: number | null;
  maxPct: number | null;
}

export interface TimelineState {
  viewMode: ViewMode;
  startDate: Date;
  selectedTeams: string[];
  searchQuery: string;
  utilizationFilter: UtilizationFilter | null;
  setViewMode: (mode: ViewMode) => void;
  setStartDate: (date: Date) => void;
  setSelectedTeams: (teams: string[]) => void;
  setSearchQuery: (query: string) => void;
  setUtilizationFilter: (filter: UtilizationFilter | null) => void;
  scrollForward: () => void;
  scrollBack: () => void;
  goToToday: () => void;
}

export interface DayInfo {
  date: Date;
  /** "yyyy-MM-dd" */
  key: string;
  /** 0 = Sunday, 1 = Monday, … (getDay()). Used for weekend detection. */
  dayOfWeek: number;
  label: string;
  isWeekend: boolean;
}

export interface WeekInfo {
  weekNumber: number;
  label: string;
  days: DayInfo[];
}

export interface MonthInfo {
  label: string;
  key: string;
}

export interface MonthDef {
  key: string;
  year: number;
  month: number;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export interface VacationRange {
  start_date: string;
  end_date: string;
}

export interface TimelineHeaderProps {
  viewMode: ViewMode;
  months: MonthInfo[];
  workingDaysPerMonth: Record<string, number>;
  weeks: WeekInfo[];
  allDays: DayInfo[];
  holidayMap: Record<string, string>;
}

export interface TimelineRowProps {
  employeeId: number;
  name: string;
  team: string | null;
  assignments: TimelineAssignment[];
  vacations?: VacationInfo[];
  utilization: Record<string, MonthUtilization>;
  months: MonthDef[];
  weeks: WeekInfo[];
  allDays: DayInfo[];
  viewMode: ViewMode;
  onAssignmentClick: (assignment: TimelineAssignment) => void;
  onVacationClick: (vacation: VacationInfo) => void;
  onEmptyClick: (employeeId: number, dateKey: string) => void;
  onResizeEnd: (
    assignmentId: number,
    edge: "left" | "right",
    deltaPx: number,
  ) => void;
  onBarContextMenu: (
    assignmentId: number,
    x: number,
    y: number,
    splitDate: string,
    splitDateIsValid: boolean,
  ) => void;
  holidayMap: Record<string, string>;
  isOdd: boolean;
  readOnly?: boolean;
}

export interface TimelineBarProps {
  assignment: TimelineAssignment;
  employeeId: number;
  left: number;
  width: number;
  /** Date string (yyyy-MM-dd) corresponding to the bar's left edge (may differ from assignment.start_date when clipped) */
  barStartDate: string;
  onClick: () => void;
  onResizeEnd: (
    assignmentId: number,
    edge: "left" | "right",
    deltaPx: number,
  ) => void;
  onBarContextMenu: (
    x: number,
    y: number,
    splitDate: string,
    splitDateIsValid: boolean,
  ) => void;
  pxPerDay: number;
  showDailyHours?: boolean;
  readOnly?: boolean;
}

export interface DaySummary {
  totalHours: number;
  employeeCount: number;
  ftePct: number;
}

export interface TimelineSummaryRowProps {
  employees: TimelineEmployee[];
  viewMode: ViewMode;
  months: MonthDef[];
  allDays: DayInfo[];
  holidayMap: Record<string, string>;
}

export interface EmployeeUtilizationPanelProps {
  employee: TimelineEmployee;
  months: MonthDef[];
  onClose: () => void;
  onEditAssignment: (assignment: TimelineAssignment) => void;
}

export interface VacationDialogProps {
  open: boolean;
  onClose: () => void;
  vacation: VacationInfo | null;
  holidayMap: Record<string, string>;
}

export interface UtilizationBadgeProps {
  percentage: number;
  isOverbooked: boolean;
}
