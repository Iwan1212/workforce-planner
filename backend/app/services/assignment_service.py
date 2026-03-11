from __future__ import annotations

import calendar
from datetime import date
from decimal import Decimal
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import AllocationType, Assignment
from app.utils.working_days import get_working_days, get_working_days_in_month


def calculate_daily_hours(
    allocation_type: str,
    allocation_value: Decimal | float,
    year: int,
    month: int,
    start_date: date | None = None,
    end_date: date | None = None,
) -> Decimal:
    """Calculate daily hours for an assignment in a given month.

    For percentage: daily_hours = 8 * (allocation_value / 100)
    For monthly_hours: daily_hours = allocation_value / working_days_in_month
    For total_hours: daily_hours = allocation_value / working_days(start_date, end_date)
    """
    value = Decimal(str(allocation_value))
    if (
        allocation_type == AllocationType.percentage.value
        or allocation_type == AllocationType.percentage
    ):
        return Decimal("8") * (value / Decimal("100"))

    if (
        allocation_type == AllocationType.total_hours.value
        or allocation_type == AllocationType.total_hours
    ):
        if start_date and end_date:
            total_wd = get_working_days(start_date, end_date)
        else:
            total_wd = get_working_days_in_month(year, month)
        return (value / Decimal(str(total_wd))) if total_wd > 0 else Decimal("0")

    # monthly_hours
    wd = get_working_days_in_month(year, month)
    if wd == 0:
        return Decimal("0")
    return value / Decimal(str(wd))


def calculate_assignment_hours_in_month(
    assignment_start: date,
    assignment_end: date,
    allocation_type: str,
    allocation_value: Decimal | float,
    year: int,
    month: int,
) -> Decimal:
    """Calculate total hours for an assignment in a specific month.

    Handles partial months — only counts working days where the assignment
    overlaps with the given month.
    """
    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])

    # Overlap between assignment period and month
    overlap_start = max(assignment_start, month_start)
    overlap_end = min(assignment_end, month_end)

    if overlap_start > overlap_end:
        return Decimal("0")

    overlap_working_days = get_working_days(overlap_start, overlap_end)
    if overlap_working_days == 0:
        return Decimal("0")

    daily_hours = calculate_daily_hours(
        allocation_type, allocation_value, year, month,
        start_date=assignment_start, end_date=assignment_end,
    )
    return daily_hours * Decimal(str(overlap_working_days))


async def calculate_utilization(
    db: AsyncSession,
    employee_id: int,
    year: int,
    month: int,
) -> dict:
    """Calculate utilization for an employee in a given month.

    Returns dict with: percentage, hours, available_hours, is_overbooked
    """
    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])

    result = await db.execute(
        select(Assignment).where(
            Assignment.employee_id == employee_id,
            Assignment.start_date <= month_end,
            Assignment.end_date >= month_start,
        )
    )
    assignments = result.scalars().all()

    available_hours = Decimal(str(get_working_days_in_month(year, month))) * Decimal(
        "8"
    )
    total_hours = Decimal("0")

    for a in assignments:
        total_hours += calculate_assignment_hours_in_month(
            a.start_date,
            a.end_date,
            a.allocation_type.value
            if hasattr(a.allocation_type, "value")
            else a.allocation_type,
            a.allocation_value,
            year,
            month,
        )

    percentage = float(
        round(
            (total_hours / available_hours * Decimal("100"))
            if available_hours > 0
            else Decimal("0"),
            1,
        )
    )

    return {
        "percentage": percentage,
        "hours": float(round(total_hours, 1)),
        "available_hours": float(round(available_hours, 1)),
        "is_overbooked": percentage > 100,
    }
