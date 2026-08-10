from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Sequence

from app.models.employee import CapacityType, EmployeeCapacity, resolve_capacity_at
from app.services.assignment_service import FULL_TIME_DAILY_HOURS, calculate_daily_hours

# The capacity every employee gets on migration and on creation: full time,
# from always. Narrowing it is a deliberate act (it marks an employment start).
BASELINE_VALID_FROM = date(1900, 1, 1)

NO_CAPACITY = Decimal("0")


def daily_capacity_hours(
    capacities: Sequence[EmployeeCapacity], day: date
) -> Decimal:
    """Hours the employee is contracted for on a working day in `day`'s month.

    Zero when no capacity entry covers the day, which means the employee is not
    employed then. Monthly-hours contracts spread over that month's working
    days, so the figure varies month to month; percentage contracts do not.
    """
    capacity = resolve_capacity_at(capacities, day)
    if capacity is None:
        return NO_CAPACITY
    return calculate_daily_hours(
        capacity.capacity_type.value,
        capacity.capacity_value,
        day.year,
        day.month,
    )


def assignment_base_daily_hours(
    capacities: Sequence[EmployeeCapacity] | None, day: date
) -> Decimal:
    """What 100% means for an assignment on `day`.

    A percentage is a share of the person's own time, so it scales with their
    contract. Two deliberate fallbacks to the full-time norm: placeholder
    assignments have nobody to scale to (`capacities` is None), and days outside
    any contract would otherwise make a percentage worth zero hours, silently
    hiding work planned before someone joins. Keeping those hours visible lets
    the period show up as overbooked against zero availability instead.
    """
    if capacities is None:
        return FULL_TIME_DAILY_HOURS
    hours = daily_capacity_hours(capacities, day)
    return hours if hours > 0 else FULL_TIME_DAILY_HOURS


def build_capacity_periods(
    capacities: Sequence[EmployeeCapacity], start_date: date, end_date: date
) -> list[dict]:
    """Flatten capacity into runs of constant daily hours across a date range.

    The frontend needs per-day capacity to size its own availability figures,
    but sending one entry per day would be wasteful and sending one per month
    would be wrong when a contract starts mid-month. Run-length encoding is
    exact and collapses to a single entry for the full-time majority.

    Returns entries ordered by date, each `{"from": iso_date, "daily_hours":
    float}`, in force until the next entry starts.
    """
    periods: list[dict] = []
    day = start_date
    while day <= end_date:
        hours = float(round(daily_capacity_hours(capacities, day), 2))
        if not periods or periods[-1]["daily_hours"] != hours:
            periods.append({"from": day.isoformat(), "daily_hours": hours})
        day += timedelta(days=1)
    return periods


def serialize_capacity(capacity: EmployeeCapacity | None) -> dict | None:
    """Serialize one capacity entry for API responses."""
    if capacity is None:
        return None
    return {
        "id": capacity.id,
        "valid_from": capacity.valid_from.isoformat(),
        "capacity_type": capacity.capacity_type.value,
        "capacity_value": float(capacity.capacity_value),
        "is_full_time": capacity.is_full_time,
    }


def baseline_capacity(employee_id: int | None = None) -> EmployeeCapacity:
    """A full-time-from-always entry, used for new employees."""
    return EmployeeCapacity(
        employee_id=employee_id,
        valid_from=BASELINE_VALID_FROM,
        capacity_type=CapacityType.percentage,
        capacity_value=Decimal("100"),
    )


__all__ = [
    "BASELINE_VALID_FROM",
    "FULL_TIME_DAILY_HOURS",
    "assignment_base_daily_hours",
    "baseline_capacity",
    "build_capacity_periods",
    "daily_capacity_hours",
    "serialize_capacity",
]
