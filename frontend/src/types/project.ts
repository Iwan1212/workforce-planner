export interface Project {
  id: number;
  name: string;
  color: string;
  is_deleted: boolean;
  is_archived: boolean;
  created_at: string;
}

export interface ProjectCreateData {
  name: string;
  color: string;
}

export interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectCreateData) => void;
  project?: Project | null;
  isSubmitting?: boolean;
}
