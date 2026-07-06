"""Unit tests for the occupancy engine in app.api.calendar.

Tests the private helpers directly (no HTTP):
- _compute_occupancy_for_period
- _get_weeks_in_range
- _week_key

Fixed dates used below (2026, no Polish holidays unless stated):
- Week Mon 2026-03-02 .. Sun 2026-03-08 -> 5 working days.
"""

from datetime import date
from types import SimpleNamespace

from app.api.calendar import (
    _compute_occupancy_for_period,
    _get_weeks_in_range,
    _week_key,
)
from app.models.assignment import AllocationType

WEEK_START = date(2026, 3, 2)  # Monday
WEEK_END = date(2026, 3, 8)  # Sunday


def make_assignment(start, end, allocation_type, value):
    return SimpleNamespace(
        start_date=start,
        end_date=end,
        allocation_type=allocation_type,
        allocation_value=value,
    )


def make_vacation(start, end):
    return SimpleNamespace(start_date=start, end_date=end)


# --- _compute_occupancy_for_period ---


def test_percentage_allocation_returns_allocation_percentage():
    """A 50% assignment over a full week yields 50% occupancy."""
    a = make_assignment(WEEK_START, WEEK_END, AllocationType.percentage, 50.0)
    result = _compute_occupancy_for_period([a], [], WEEK_START, WEEK_END, set())

    assert result["percentage"] == 50.0
    assert result["hours"] == 20.0  # 5 wd * 4h
    assert result["available_hours"] == 40.0  # 5 wd * 8h
    assert result["is_overbooked"] is False


def test_percentage_allocation_vacation_excluded_from_both_sides():
    """Vacation days drop out of numerator AND denominator -> % unchanged."""
    a = make_assignment(WEEK_START, WEEK_END, AllocationType.percentage, 50.0)
    vac = make_vacation(date(2026, 3, 2), date(2026, 3, 3))  # Mon-Tue

    result = _compute_occupancy_for_period([a], [vac], WEEK_START, WEEK_END, set())

    assert result["percentage"] == 50.0
    assert result["hours"] == 12.0  # 3 non-vacation wd * 4h
    assert result["available_hours"] == 24.0  # 3 wd * 8h


def test_hours_allocation_vacation_shrinks_denominator():
    """Hours-based commitment stays fixed while vacation shrinks availability,
    so occupancy can exceed 100%."""
    # 40h total over Mon-Fri (5 working days) -> 8h/day
    a = make_assignment(
        date(2026, 3, 2), date(2026, 3, 6), AllocationType.total_hours, 40.0
    )
    vac = make_vacation(date(2026, 3, 2), date(2026, 3, 3))  # Mon-Tue

    result = _compute_occupancy_for_period([a], [vac], WEEK_START, WEEK_END, set())

    assert result["hours"] == 40.0  # full commitment kept
    assert result["available_hours"] == 24.0  # 3 wd * 8h
    assert result["percentage"] == 166.7  # round(40/24*100, 1)
    assert result["is_overbooked"] is True


def test_zero_working_days_full_vacation_guard():
    """Period fully covered by vacation must not divide by zero."""
    a = make_assignment(WEEK_START, WEEK_END, AllocationType.percentage, 100.0)
    vac = make_vacation(WEEK_START, WEEK_END)

    result = _compute_occupancy_for_period([a], [vac], WEEK_START, WEEK_END, set())

    assert result["percentage"] == 0.0
    assert result["available_hours"] == 0.0
    assert result["is_overbooked"] is False


def test_zero_working_days_weekend_only_period():
    """Weekend-only period has zero working days -> everything is zero."""
    a = make_assignment(date(2026, 3, 1), date(2026, 3, 31), AllocationType.percentage, 100.0)
    result = _compute_occupancy_for_period(
        [a], [], date(2026, 3, 7), date(2026, 3, 8), set()  # Sat-Sun
    )

    assert result["percentage"] == 0.0
    assert result["hours"] == 0.0
    assert result["available_hours"] == 0.0


def test_holidays_excluded_from_working_days():
    """A holiday inside the period reduces working days like a weekend."""
    a = make_assignment(WEEK_START, WEEK_END, AllocationType.percentage, 100.0)
    holidays = {date(2026, 3, 4)}  # Wednesday

    result = _compute_occupancy_for_period([a], [], WEEK_START, WEEK_END, holidays)

    assert result["available_hours"] == 32.0  # 4 wd * 8h
    assert result["hours"] == 32.0
    assert result["percentage"] == 100.0


def test_assignment_partially_overlapping_period():
    """Only days inside both the period and the assignment count."""
    # Assignment covers only Wed-Fri of the week
    a = make_assignment(
        date(2026, 3, 4), date(2026, 3, 6), AllocationType.percentage, 100.0
    )
    result = _compute_occupancy_for_period([a], [], WEEK_START, WEEK_END, set())

    assert result["hours"] == 24.0  # 3 wd * 8h
    assert result["available_hours"] == 40.0
    assert result["percentage"] == 60.0


# --- _get_weeks_in_range ---


def test_weeks_in_range_monday_start():
    weeks = _get_weeks_in_range(date(2026, 3, 2), date(2026, 3, 15))
    assert weeks == [
        (date(2026, 3, 2), date(2026, 3, 8)),
        (date(2026, 3, 9), date(2026, 3, 15)),
    ]


def test_weeks_in_range_non_monday_start_aligns_to_monday():
    """A mid-week start (e.g. free-text occupancy filter date) must snap to
    the Monday of its ISO week so windows match the frontend grid."""
    # 2026-01-07 is a Wednesday; its ISO week starts Monday 2026-01-05
    weeks = _get_weeks_in_range(date(2026, 1, 7), date(2026, 1, 20))

    assert weeks[0] == (date(2026, 1, 5), date(2026, 1, 11))
    assert weeks == [
        (date(2026, 1, 5), date(2026, 1, 11)),
        (date(2026, 1, 12), date(2026, 1, 18)),
        (date(2026, 1, 19), date(2026, 1, 25)),
    ]
    # Every window is a true ISO week: Monday..Sunday
    for start, end in weeks:
        assert start.weekday() == 0
        assert end.weekday() == 6


def test_weeks_in_range_non_monday_start_produces_iso_week_keys():
    """Keys generated for a non-Monday start align with ISO week numbers."""
    weeks = _get_weeks_in_range(date(2026, 1, 7), date(2026, 1, 20))
    keys = [_week_key(ws) for ws, _ in weeks]
    # 2026-01-05 is ISO week 2 of 2026 (week 1 starts Mon 2025-12-29)
    assert keys == ["w-2026-2", "w-2026-3", "w-2026-4"]


# --- _week_key ---


def test_week_key_format():
    assert _week_key(date(2026, 1, 5)) == "w-2026-2"
    assert _week_key(date(2026, 3, 2)) == "w-2026-10"


def test_week_key_year_boundary_matches_frontend_convention():
    """Frontend keys use the calendar year of the week's Monday plus the ISO
    week number; the backend must produce the same key at year boundaries."""
    # Mon 2025-12-29 is ISO week 1 of 2026, but the frontend labels it with
    # the Monday's calendar year: "w-2025-1".
    assert _week_key(date(2025, 12, 29)) == "w-2025-1"


# --- monthly vs weekly consistency ---


def test_monthly_and_weekly_consistent_for_flat_percentage():
    """A constant 50% assignment gives 50% for the month and for every week
    fully inside that month."""
    a = make_assignment(
        date(2026, 6, 1), date(2026, 6, 30), AllocationType.percentage, 50.0
    )

    monthly = _compute_occupancy_for_period(
        [a], [], date(2026, 6, 1), date(2026, 6, 30), set()
    )
    assert monthly["percentage"] == 50.0

    # June 2026: weeks Jun 1-7, 8-14, 15-21, 22-28 are fully inside the month
    for week_start, week_end in _get_weeks_in_range(date(2026, 6, 1), date(2026, 6, 28)):
        weekly = _compute_occupancy_for_period(
            [a], [], week_start, week_end, set()
        )
        assert weekly["percentage"] == 50.0, f"week {week_start}"
