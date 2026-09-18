from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from app.models.assignment import AllocationType
from app.services.assignment_service import calculate_daily_hours
from app.services.capacity_service import (
    assignment_base_daily_hours,
    daily_capacity_hours,
)

# Keys the timeline contract exposes. The confirmed/tentative split stays out of
# it on purpose: certainty is a planning-summary concern, and the timeline marks
# tentative work on the bars themselves rather than in its numbers.
TIMELINE_OCCUPANCY_KEYS = ("percentage", "hours", "workable_hours", "is_overbooked")


def compute_occupancy_for_period(
    assignments: list,
    vacations: list,
    period_start: date,
    period_end: date,
    holiday_dates: set,
    capacities: list | None = None,
) -> dict:
    """Compute occupancy metrics for a period (week or month).

    Denominator (`workable_hours`): the employee's contracted hours summed over
    non-vacation working days. That is a full-time day for the full-time majority, and their
    own shorter day for part-timers, so vacation always removes what the person
    would actually have worked rather than a flat eight hours.

    Numerator:
      - percentage allocations: hours only on non-vacation working days
      - hours-based allocations: full committed hours across all working days
        (vacation reduces the denominator, not the commitment)

    The numerator is also split by `is_tentative`, so a summary can report how
    much of the booked time is actually committed. `hours` stays the total.
    `vacation_hours` reports what vacation removed from the denominator, so a
    summary can show why availability is lower than the calendar suggests.

    Zero availability with hours booked (work planned before someone joins) is
    reported as overbooked rather than as 0%, since the ratio is undefined.
    """
    gross_available = Decimal("0")
    net_available = Decimal("0")
    confirmed_hours = Decimal("0")
    tentative_hours = Decimal("0")
    internal_confirmed_hours = Decimal("0")
    internal_tentative_hours = Decimal("0")

    d = period_start
    while d <= period_end:
        if d.weekday() >= 5 or d in holiday_dates:
            d += timedelta(days=1)
            continue

        is_vacation = any(v.start_date <= d <= v.end_date for v in vacations)

        contracted = (
            daily_capacity_hours(capacities, d)
            if capacities is not None
            else Decimal("8")
        )
        gross_available += contracted
        if not is_vacation:
            net_available += contracted

        for a in assignments:
            if not (a.start_date <= d <= a.end_date):
                continue
            if a.allocation_type == AllocationType.percentage and is_vacation:
                continue
            daily = calculate_daily_hours(
                a.allocation_type.value,
                a.allocation_value,
                d.year,
                d.month,
                start_date=a.start_date,
                end_date=a.end_date,
                base_daily_hours=assignment_base_daily_hours(capacities, d),
            )
            # Internal work is a second cut through the same hours, not a
            # third bucket: it is tracked alongside the certainty split rather
            # than instead of it, so a summary can report both at once. A
            # project is either internal or client work, never unset, so the
            # flag is read directly.
            internal = a.project.is_internal
            if a.is_tentative:
                tentative_hours += daily
                if internal:
                    internal_tentative_hours += daily
            else:
                confirmed_hours += daily
                if internal:
                    internal_confirmed_hours += daily

        d += timedelta(days=1)

    hours_numerator = confirmed_hours + tentative_hours

    if net_available == 0:
        pct = 0.0
        overbooked = hours_numerator > 0
    else:
        pct = float(round(hours_numerator / net_available * Decimal("100"), 1))
        overbooked = pct > 100

    return {
        "percentage": pct,
        "hours": float(round(hours_numerator, 1)),
        "confirmed_hours": float(round(confirmed_hours, 1)),
        "tentative_hours": float(round(tentative_hours, 1)),
        # Only the internal share is reported; the client share is whatever is
        # left of each certainty bucket. Deriving it by subtraction is what
        # makes "client + internal = the whole" true by construction.
        "internal_confirmed_hours": float(round(internal_confirmed_hours, 1)),
        "internal_tentative_hours": float(round(internal_tentative_hours, 1)),
        "workable_hours": float(round(net_available, 1)),
        "vacation_hours": float(round(gross_available - net_available, 1)),
        "is_overbooked": overbooked,
    }


def timeline_occupancy(*args, **kwargs) -> dict:
    """`compute_occupancy_for_period` projected down to the timeline contract.

    Keeping the projection here rather than at the call site means the
    confirmed/tentative figures cannot reach the timeline response, and with it
    the timeline UI, by accident.
    """
    occupancy = compute_occupancy_for_period(*args, **kwargs)
    return {key: occupancy[key] for key in TIMELINE_OCCUPANCY_KEYS}


__all__ = [
    "TIMELINE_OCCUPANCY_KEYS",
    "compute_occupancy_for_period",
    "timeline_occupancy",
]
