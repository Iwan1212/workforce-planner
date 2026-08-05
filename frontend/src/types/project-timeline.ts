import type { HolidayInfo } from "./assignment";

export interface ProjectTimelineAssignment {
  id: number;
  /** null => placeholder assignment (not yet allocated to a person). */
  employee_id: number | null;
  employee_name: string | null;
  employee_team: string | null;
  start_date: string;
  end_date: string;
  allocation_type: string;
  allocation_value: number;
  note: string | null;
  is_tentative: boolean;
  daily_hours: number;
}

export interface ProjectTimelineProject {
  id: number;
  name: string;
  color: string;
  assignments: ProjectTimelineAssignment[];
}

export interface ProjectTimelineData {
  projects: ProjectTimelineProject[];
  holidays: HolidayInfo[];
  working_days_per_month: Record<string, number>;
}
