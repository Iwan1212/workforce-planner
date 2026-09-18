export interface Project {
  id: number;
  name: string;
  color: string;
  is_archived: boolean;
  /** Internal work: recruitment, our own product, sales and PM time. */
  is_internal: boolean;
  created_at: string;
}

export interface ProjectCreateData {
  name: string;
  color: string;
  is_internal: boolean;
}

export interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectCreateData) => void;
  project?: Project | null;
  isSubmitting?: boolean;
}
