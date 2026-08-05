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

export interface PeriodOccupancy {
  percentage: number;
  hours: number;
  available_hours: number;
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
  occupancy: Record<string, PeriodOccupancy>;
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
  /** Assignments not yet allocated to any employee (employee_id IS NULL). */
  placeholders?: TimelineAssignment[];
  holidays: HolidayInfo[];
  working_days_per_month: Record<string, number>;
  vacation_sync_status?: VacationSyncStatus;
}

export interface AssignmentCreateData {
  /** null => placeholder assignment (not yet allocated to a person). */
  employee_id: number | null;
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
  defaultProjectId?: number | null;
  defaultStartDate?: string | null;
}

export interface AssignmentEmployeeOption {
  id: number;
  last_name: string;
  first_name: string;
}

export interface AssignmentProjectOption {
  id: number;
  name: string;
  color: string;
}

export interface AssignmentFormEmployeeProjectProps {
  employeeId: string;
  projectId: string;
  onEmployeeChange: (value: string) => void;
  onProjectChange: (value: string) => void;
  employees: AssignmentEmployeeOption[];
  projects: AssignmentProjectOption[];
  /** Validation error for the employee field (required in create mode). */
  employeeError?: string | null;
}

export interface AssignmentFormDatesProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

export interface AssignmentFormAllocationProps {
  allocationType: string;
  allocationValue: string;
  onAllocationTypeChange: (value: string) => void;
  onAllocationValueChange: (value: string) => void;
}

export interface AssignmentFormNoteProps {
  note: string;
  isTentative: boolean;
  onNoteChange: (value: string) => void;
  onTentativeChange: (value: boolean) => void;
}

export interface AssignmentFormFooterProps {
  isEditing: boolean;
  showDeleteConfirm: boolean;
  onDeleteClick: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onClose: () => void;
  isPending: boolean;
}
