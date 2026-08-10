export interface DeleteResponse {
  deleted?: boolean;
  has_active_assignments?: boolean;
  active_assignments_count?: number;
  message?: string;
}

export interface ProjectDeleteResponse {
  deleted?: boolean;
  has_assignments?: boolean;
  assignments_count?: number;
  deleted_assignments?: number;
  message?: string;
}
