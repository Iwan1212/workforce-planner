import type {
  CapacityPeriod,
  CapacityType,
  EmployeeCapacity,
} from "@/types/employee";

/** Hours in a full-time working day — the norm a percentage is measured against. */
export const FULL_TIME_DAILY_HOURS = 8;

// Same wording as the assignment modal's allocation type, so the two forms read
// as one vocabulary.
export const CAPACITY_TYPE_OPTIONS: { value: CapacityType; label: string }[] = [
  { value: "percentage", label: "Procent (%)" },
  { value: "monthly_hours", label: "Godziny / msc" },
];

/** Short label for a capacity, e.g. "50%" or "40h/mies.". */
export function formatCapacity(capacity: EmployeeCapacity): string {
  if (capacity.capacity_type === "monthly_hours") {
    return `${formatNumber(capacity.capacity_value)}h/msc`;
  }
  return `${formatNumber(capacity.capacity_value)}%`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}

/**
 * Contracted hours on a given day, from the run-length encoded periods the
 * timeline endpoint returns.
 *
 * Zero means no period covers the day, i.e. the employee was not employed
 * then. Missing periods (older cached responses) fall back to a full-time day
 * so availability never silently collapses to nothing.
 */
export function dailyCapacityHours(
  periods: CapacityPeriod[] | undefined,
  dateKey: string,
): number {
  if (!periods || periods.length === 0) return FULL_TIME_DAILY_HOURS;

  let hours = 0;
  for (const period of periods) {
    if (period.from > dateKey) break;
    hours = period.daily_hours;
  }
  return hours;
}
