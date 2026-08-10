"""Unit tests for part-time capacity: resolution, availability and occupancy.

Fixed dates used below:
- March 2026 has 22 working days (no Polish holidays fall on a weekday).
- Week Mon 2026-03-02 .. Sun 2026-03-08 -> 5 working days.
"""

from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.api.calendar import _compute_occupancy_for_period
from app.models.assignment import AllocationType
from app.models.employee import CapacityType, resolve_capacity_at
from app.services.capacity_service import (
    assignment_base_daily_hours,
    build_capacity_periods,
    daily_capacity_hours,
)
from app.utils.working_days import get_working_days_in_month

WEEK_START = date(2026, 3, 2)  # Monday
WEEK_END = date(2026, 3, 8)  # Sunday
MARCH_START = date(2026, 3, 1)
MARCH_END = date(2026, 3, 31)


def make_capacity(valid_from, capacity_type, value):
    return SimpleNamespace(
        valid_from=valid_from,
        capacity_type=capacity_type,
        capacity_value=Decimal(str(value)),
    )


def make_assignment(start, end, allocation_type, value):
    return SimpleNamespace(
        start_date=start,
        end_date=end,
        allocation_type=allocation_type,
        allocation_value=value,
    )


def make_vacation(start, end):
    return SimpleNamespace(start_date=start, end_date=end)


FULL_TIME = [make_capacity(date(1900, 1, 1), CapacityType.percentage, 100)]
HALF_TIME = [make_capacity(date(1900, 1, 1), CapacityType.percentage, 50)]
FORTY_HOURS = [make_capacity(date(1900, 1, 1), CapacityType.monthly_hours, 40)]


# --- resolve_capacity_at ---


def test_latest_entry_on_or_before_the_day_wins():
    entries = [
        make_capacity(date(1900, 1, 1), CapacityType.percentage, 100),
        make_capacity(date(2026, 3, 1), CapacityType.monthly_hours, 40),
        make_capacity(date(2026, 10, 1), CapacityType.percentage, 100),
    ]

    assert resolve_capacity_at(entries, date(2026, 2, 28)).capacity_value == 100
    assert resolve_capacity_at(entries, date(2026, 3, 1)).capacity_value == 40
    assert resolve_capacity_at(entries, date(2026, 9, 30)).capacity_value == 40
    # Returning to full time is just another entry, not a special case.
    assert resolve_capacity_at(entries, date(2026, 10, 1)).capacity_type == (
        CapacityType.percentage
    )


def test_unordered_entries_resolve_the_same():
    entries = [
        make_capacity(date(2026, 3, 1), CapacityType.monthly_hours, 40),
        make_capacity(date(1900, 1, 1), CapacityType.percentage, 100),
    ]
    assert resolve_capacity_at(entries, date(2026, 5, 1)).capacity_value == 40


def test_day_before_first_entry_is_uncovered():
    """No entry covering the day means not employed yet, not full time."""
    entries = [make_capacity(date(2026, 3, 1), CapacityType.percentage, 100)]

    assert resolve_capacity_at(entries, date(2026, 2, 28)) is None
    assert daily_capacity_hours(entries, date(2026, 2, 28)) == 0


# --- daily_capacity_hours ---


def test_percentage_capacity_is_a_fixed_share_of_a_full_day():
    assert daily_capacity_hours(FULL_TIME, date(2026, 3, 10)) == Decimal("8")
    assert daily_capacity_hours(HALF_TIME, date(2026, 3, 10)) == Decimal("4")


def test_monthly_hours_capacity_spreads_over_that_month_working_days():
    """40h/month is a different contract from 25%: the daily figure moves with
    the calendar so the monthly total stays at 40."""
    march_days = get_working_days_in_month(2026, 3)
    february_days = get_working_days_in_month(2026, 2)
    assert march_days != february_days  # guards the point of this test

    march = daily_capacity_hours(FORTY_HOURS, date(2026, 3, 10))
    february = daily_capacity_hours(FORTY_HOURS, date(2026, 2, 10))

    assert march == Decimal("40") / Decimal(str(march_days))
    assert february == Decimal("40") / Decimal(str(february_days))
    assert march != february


# --- occupancy denominator ---


def test_part_timer_full_commitment_reads_as_one_hundred_percent():
    """The headline case: 40h booked for someone contracted for 40h/month is a
    full plate, not a quarter of one."""
    a = make_assignment(
        MARCH_START, MARCH_END, AllocationType.monthly_hours, 40.0
    )
    result = _compute_occupancy_for_period(
        [a], [], MARCH_START, MARCH_END, set(), FORTY_HOURS
    )

    assert result["percentage"] == 100.0
    assert result["hours"] == 40.0
    assert result["available_hours"] == 40.0
    assert result["is_overbooked"] is False


def test_same_assignment_against_a_full_time_contract():
    """Same 40h, full-time contract: the old behaviour, unchanged."""
    a = make_assignment(
        MARCH_START, MARCH_END, AllocationType.monthly_hours, 40.0
    )
    result = _compute_occupancy_for_period(
        [a], [], MARCH_START, MARCH_END, set(), FULL_TIME
    )

    march_hours = get_working_days_in_month(2026, 3) * 8
    assert result["available_hours"] == float(march_hours)
    assert result["percentage"] == round(40 / march_hours * 100, 1)


def test_percentage_allocation_is_a_share_of_the_persons_own_time():
    """100% of a half-timer is 4h/day and reads as 100%, not 50%."""
    a = make_assignment(WEEK_START, WEEK_END, AllocationType.percentage, 100.0)
    result = _compute_occupancy_for_period(
        [a], [], WEEK_START, WEEK_END, set(), HALF_TIME
    )

    assert result["percentage"] == 100.0
    assert result["hours"] == 20.0  # 5 wd * 4h
    assert result["available_hours"] == 20.0


def test_vacation_removes_the_part_timers_own_day_not_eight_hours():
    """A half-timer's vacation day costs 4h of availability, so the percentage
    is unchanged rather than distorted."""
    a = make_assignment(WEEK_START, WEEK_END, AllocationType.percentage, 100.0)
    vac = make_vacation(date(2026, 3, 2), date(2026, 3, 3))  # Mon-Tue

    result = _compute_occupancy_for_period(
        [a], [vac], WEEK_START, WEEK_END, set(), HALF_TIME
    )

    assert result["available_hours"] == 12.0  # 3 wd * 4h
    assert result["hours"] == 12.0
    assert result["percentage"] == 100.0


def test_hours_commitment_over_a_part_timer_vacation_overbooks():
    a = make_assignment(
        date(2026, 3, 2), date(2026, 3, 6), AllocationType.total_hours, 20.0
    )
    vac = make_vacation(date(2026, 3, 2), date(2026, 3, 3))  # Mon-Tue

    result = _compute_occupancy_for_period(
        [a], [vac], WEEK_START, WEEK_END, set(), HALF_TIME
    )

    assert result["hours"] == 20.0  # commitment untouched
    assert result["available_hours"] == 12.0  # 3 wd * 4h
    assert result["is_overbooked"] is True


def test_capacity_change_mid_range_only_affects_days_after_it():
    """The whole point of dated entries: February keeps the old contract."""
    entries = [
        make_capacity(date(1900, 1, 1), CapacityType.percentage, 100),
        make_capacity(date(2026, 3, 1), CapacityType.percentage, 50),
    ]
    a = make_assignment(
        date(2026, 1, 1), date(2026, 12, 31), AllocationType.percentage, 100.0
    )

    february = _compute_occupancy_for_period(
        [a], [], date(2026, 2, 1), date(2026, 2, 28), set(), entries
    )
    march = _compute_occupancy_for_period(
        [a], [], MARCH_START, MARCH_END, set(), entries
    )

    assert february["available_hours"] == get_working_days_in_month(2026, 2) * 8
    assert march["available_hours"] == get_working_days_in_month(2026, 3) * 4
    # Both read as 100%, because the commitment scales with the contract.
    assert february["percentage"] == 100.0
    assert march["percentage"] == 100.0


def test_omitted_capacity_keeps_the_full_time_default():
    """Callers that pass no capacity (placeholder rows, older call sites) must
    keep behaving exactly as before."""
    a = make_assignment(WEEK_START, WEEK_END, AllocationType.percentage, 50.0)

    assert _compute_occupancy_for_period(
        [a], [], WEEK_START, WEEK_END, set()
    ) == _compute_occupancy_for_period(
        [a], [], WEEK_START, WEEK_END, set(), FULL_TIME
    )


# --- days outside any contract ---


def test_work_planned_before_employment_starts_is_flagged_not_hidden():
    """Availability is zero, so the ratio is undefined; the hours must still
    show and the period must go red instead of reading as a quiet 0%."""
    entries = [make_capacity(date(2026, 3, 1), CapacityType.percentage, 100)]
    a = make_assignment(
        date(2026, 2, 1), date(2026, 2, 28), AllocationType.percentage, 100.0
    )

    result = _compute_occupancy_for_period(
        [a], [], date(2026, 2, 1), date(2026, 2, 28), set(), entries
    )

    assert result["available_hours"] == 0.0
    assert result["hours"] > 0
    assert result["is_overbooked"] is True


def test_empty_period_before_employment_is_not_flagged():
    entries = [make_capacity(date(2026, 3, 1), CapacityType.percentage, 100)]

    result = _compute_occupancy_for_period(
        [], [], date(2026, 2, 1), date(2026, 2, 28), set(), entries
    )

    assert result["available_hours"] == 0.0
    assert result["hours"] == 0.0
    assert result["is_overbooked"] is False


def test_assignment_base_falls_back_to_full_time_outside_any_contract():
    entries = [make_capacity(date(2026, 3, 1), CapacityType.percentage, 50)]

    assert assignment_base_daily_hours(entries, date(2026, 2, 1)) == Decimal("8")
    assert assignment_base_daily_hours(entries, date(2026, 3, 1)) == Decimal("4")
    # Placeholder assignments have nobody to scale to.
    assert assignment_base_daily_hours(None, date(2026, 3, 1)) == Decimal("8")


# --- build_capacity_periods ---


def test_full_timer_collapses_to_a_single_period():
    periods = build_capacity_periods(FULL_TIME, MARCH_START, date(2026, 9, 30))

    assert periods == [{"from": "2026-03-01", "daily_hours": 8.0}]


def test_periods_split_where_the_daily_figure_actually_changes():
    entries = [
        make_capacity(date(1900, 1, 1), CapacityType.percentage, 100),
        make_capacity(date(2026, 3, 16), CapacityType.percentage, 50),
    ]
    periods = build_capacity_periods(entries, MARCH_START, date(2026, 4, 30))

    assert periods == [
        {"from": "2026-03-01", "daily_hours": 8.0},
        {"from": "2026-03-16", "daily_hours": 4.0},
    ]


def test_monthly_hours_periods_split_on_month_boundaries():
    """A fixed monthly budget means a different daily figure each month, which
    is exactly why a single month-keyed number would not do."""
    periods = build_capacity_periods(FORTY_HOURS, MARCH_START, date(2026, 4, 30))

    assert [p["from"] for p in periods] == ["2026-03-01", "2026-04-01"]
    assert periods[0]["daily_hours"] == pytest.approx(
        40 / get_working_days_in_month(2026, 3), abs=0.01
    )
    assert periods[1]["daily_hours"] == pytest.approx(
        40 / get_working_days_in_month(2026, 4), abs=0.01
    )


def test_periods_start_with_zero_before_employment():
    entries = [make_capacity(date(2026, 3, 16), CapacityType.percentage, 100)]
    periods = build_capacity_periods(entries, MARCH_START, MARCH_END)

    assert periods == [
        {"from": "2026-03-01", "daily_hours": 0.0},
        {"from": "2026-03-16", "daily_hours": 8.0},
    ]


def test_capacity_value_rejects_values_beyond_type_bounds():
    from pydantic import ValidationError

    from app.schemas.employee import CapacityCreate

    with pytest.raises(ValidationError):
        CapacityCreate(
            valid_from=MARCH_START, capacity_type="percentage", capacity_value=500
        )
    with pytest.raises(ValidationError):
        CapacityCreate(
            valid_from=MARCH_START, capacity_type="monthly_hours", capacity_value=1600
        )
    # Boundary values stay accepted.
    CapacityCreate(
        valid_from=MARCH_START, capacity_type="percentage", capacity_value=100
    )
    CapacityCreate(
        valid_from=MARCH_START, capacity_type="monthly_hours", capacity_value=744
    )
