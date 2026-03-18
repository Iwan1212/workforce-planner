export interface Employee {
  id: number;
  first_name: string;
  last_name: string;
  team: string | null;
  email: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface EmployeeCreateData {
  first_name: string;
  last_name: string;
  team: string | null;
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
