export interface TimelineAssignment {
  id: number;
  project_id: number;
  project_name: string;
  project_color: string;
  start_date: string;
  end_date: string;
  allocation_type: string;
  allocation_value: number;
  note: string | null;
  is_tentative: boolean;
  daily_hours: number;
}

export interface MonthUtilization {
  percentage: number;
  hours: number;
  available_hours: number;
  vacation_days?: number;
  is_overbooked: boolean;
}

export interface VacationInfo {
  start_date: string;
  end_date: string;
  leave_type: string;
  employee_email?: string;
  synced_at?: string;
}

export interface TimelineEmployee {
  id: number;
  name: string;
  team: string | null;
  assignments: TimelineAssignment[];
  vacations?: VacationInfo[];
  utilization: Record<string, MonthUtilization>;
}

export interface HolidayInfo {
  date: string;
  name: string;
}

export interface VacationSyncStatus {
  last_synced_at: string | null;
  is_configured: boolean;
}

export interface TimelineData {
  employees: TimelineEmployee[];
  holidays: HolidayInfo[];
  working_days_per_month: Record<string, number>;
  vacation_sync_status?: VacationSyncStatus;
}

export interface AssignmentCreateData {
  employee_id: number;
  project_id: number;
  start_date: string;
  end_date: string;
  allocation_type: string;
  allocation_value: number;
  note?: string | null;
  is_tentative?: boolean;
}

export interface AssignmentModalProps {
  open: boolean;
  onClose: () => void;
  assignment?: TimelineAssignment | null;
  defaultEmployeeId?: number | null;
  defaultStartDate?: string | null;
}
