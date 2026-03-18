export interface DeleteResponse {
  deleted?: boolean;
  has_active_assignments?: boolean;
  active_assignments_count?: number;
  message?: string;
}
