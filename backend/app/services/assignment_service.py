from __future__ import annotations

from datetime import date
from decimal import Decimal

from app.models.assignment import AllocationType
from app.utils.working_days import get_working_days, get_working_days_in_month


FULL_TIME_DAILY_HOURS = Decimal("8")


def calculate_daily_hours(
    allocation_type: str,
    allocation_value: Decimal | float,
    year: int,
    month: int,
    start_date: date | None = None,
    end_date: date | None = None,
    base_daily_hours: Decimal | float = FULL_TIME_DAILY_HOURS,
) -> Decimal:
    """Calculate daily hours for an assignment in a given month.

    For percentage: daily_hours = base_daily_hours * (allocation_value / 100)
    For monthly_hours: daily_hours = allocation_value / working_days_in_month
    For total_hours: daily_hours = allocation_value / working_days(start_date, end_date)

    `base_daily_hours` is what 100% means for this assignment: a full-time day
    by default, or the employee's contracted daily hours when they work part
    time. Hours-based allocations are absolute and ignore it.
    """
    value = Decimal(str(allocation_value))
    if (
        allocation_type == AllocationType.percentage.value
        or allocation_type == AllocationType.percentage
    ):
        return Decimal(str(base_daily_hours)) * (value / Decimal("100"))

    if (
        allocation_type == AllocationType.total_hours.value
        or allocation_type == AllocationType.total_hours
    ):
        if not start_date or not end_date:
            raise ValueError("start_date and end_date are required for total_hours")
        total_wd = get_working_days(start_date, end_date)
        return (value / Decimal(str(total_wd))) if total_wd > 0 else Decimal("0")

    # monthly_hours
    wd = get_working_days_in_month(year, month)
    if wd == 0:
        return Decimal("0")
    return value / Decimal(str(wd))


