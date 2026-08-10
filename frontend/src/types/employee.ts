import type { Team } from "./team";
import type { Technology } from "./technology";

export type CapacityType = "percentage" | "monthly_hours";

/**
 * One effective-dated slice of an employee's contracted capacity. A slice runs
 * until the next one starts; time before the earliest slice is uncovered and
 * means the employee had not started yet.
 */
export interface EmployeeCapacity {
  id: number;
  valid_from: string;
  capacity_type: CapacityType;
  capacity_value: number;
  is_full_time: boolean;
}

export interface CapacityInput {
  valid_from: string;
  capacity_type: CapacityType;
  capacity_value: number;
}

/** Contracted hours per working day, in force from `from` until the next entry. */
export interface CapacityPeriod {
  from: string;
  daily_hours: number;
}

export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  team: Team | null;
  technologies: Technology[];
  email: string | null;
  is_archived: boolean;
  created_at: string;
  capacities: EmployeeCapacity[];
  /** In force today; null when no period covers today. */
  current_capacity: EmployeeCapacity | null;
}

export interface EmployeeCreateData {
  first_name: string;
  last_name: string;
  team_id: number | null;
  technology_ids: number[];
  email?: string | null;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; detail: string }[];
}

export interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: EmployeeCreateData) => void;
  employee?: Employee | null;
  isSubmitting?: boolean;
}

export interface ImportCsvDialogProps {
  open: boolean;
  onClose: () => void;
}

export interface CapacityDialogProps {
  open: boolean;
  onClose: () => void;
  employee: Employee | null;
}
