/** Availability and allocation figures shared by the month totals and team rows. */
export interface AllocationMetrics {
  /**
   * Every contracted hour on the month's working days, i.e. full capacity.
   * The other figures split it up:
   * `capacity = confirmed + tentative + vacation + remaining`.
   * Not "available": only `remaining_hours` is free to plan against.
   */
  capacity_hours: number;
  /** Capacity minus vacation: hours somebody could still work. */
  workable_hours: number;
  vacation_hours: number;
  confirmed_hours: number;
  tentative_hours: number;
  allocated_hours: number;
  /** Workable minus allocation. Negative means the scope is overbooked. */
  remaining_hours: number;
  /** Allocation against workable hours, matching the occupancy badges. */
  utilization_percentage: number;
  confirmed_percentage: number;
  employee_count: number;
  overbooked_employee_count: number;
}

export interface TeamSummary extends AllocationMetrics {
  /** Null for the synthetic bucket holding employees without a team. */
  team_id: number | null;
  team_name: string;
}

export interface MonthSummary extends AllocationMetrics {
  /** "yyyy-MM". */
  month: string;
  working_days: number;
  /** Demand from assignments with no assignee yet, outside allocated_hours. */
  unassigned_demand_hours: number;
  unassigned_assignment_count: number;
  teams: TeamSummary[];
}

export interface DashboardData {
  months: MonthSummary[];
}

export interface DashboardState {
  year: number;
  /** "yyyy-MM" of the month whose figures are shown. */
  selectedMonth: string;
  selectedTeamIds: number[];
  selectedTechnologyIds: number[];
  setYear: (year: number) => void;
  setSelectedMonth: (month: string) => void;
  setSelectedTeamIds: (ids: number[]) => void;
  setSelectedTechnologyIds: (ids: number[]) => void;
  stepYear: (delta: number) => void;
  goToToday: () => void;
}

export interface MonthTabsProps {
  months: MonthSummary[];
  selectedMonth: string;
  onSelect: (month: string) => void;
  isLoading: boolean;
}

export interface MonthStatCardsProps {
  summary: MonthSummary | undefined;
  isLoading: boolean;
}

export interface TeamBreakdownTableProps {
  summary: MonthSummary | undefined;
  isLoading: boolean;
}
