import type { HolidayInfo } from "./assignment";

export interface ProjectTimelineAssignment {
  id: number;
  employee_id: number;
  employee_name: string;
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
