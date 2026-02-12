from datetime import date

from app.services.assignment_service import calculate_assignment_hours_in_month, calculate_daily_hours


def test_percentage_daily_hours():
    """50% allocation = 4h/day regardless of month."""
    assert calculate_daily_hours("percentage", 50.0, 2026, 1) == 4.0
    assert calculate_daily_hours("percentage", 100.0, 2026, 1) == 8.0
    assert calculate_daily_hours("percentage", 25.0, 2026, 1) == 2.0


def test_monthly_hours_daily():
    """30h/month in Feb 2026 (20 working days) = 1.5h/day."""
    result = calculate_daily_hours("monthly_hours", 30.0, 2026, 2)
    assert result == 1.5


def test_monthly_hours_january():
    """160h/month in Jan 2026 (20 working days) = 8h/day."""
    result = calculate_daily_hours("monthly_hours", 160.0, 2026, 1)
    assert result == 8.0


def test_full_month_percentage():
    """50% allocation, full January 2026 (20 working days).
    daily = 4h, total = 4 * 20 = 80h.
    """
    hours = calculate_assignment_hours_in_month(
        date(2026, 1, 1), date(2026, 1, 31),
        "percentage", 50.0, 2026, 1,
    )
    assert hours == 80.0


def test_partial_month_percentage():
    """50% allocation, Jan 15-31, 2026 (12 working days).
    daily = 4h, total = 4 * 12 = 48h.
    """
    hours = calculate_assignment_hours_in_month(
        date(2026, 1, 15), date(2026, 1, 31),
        "percentage", 50.0, 2026, 1,
    )
    assert hours == 48.0


def test_monthly_hours_full_month():
    """30h/month in Feb 2026 (20 working days), full month.
    daily = 1.5h, total = 1.5 * 20 = 30h.
    """
    hours = calculate_assignment_hours_in_month(
        date(2026, 2, 1), date(2026, 2, 28),
        "monthly_hours", 30.0, 2026, 2,
    )
    assert hours == 30.0


def test_assignment_outside_month():
    """Assignment Jan 1-31 queried for February = 0 hours."""
    hours = calculate_assignment_hours_in_month(
        date(2026, 1, 1), date(2026, 1, 31),
        "percentage", 100.0, 2026, 2,
    )
    assert hours == 0.0


def test_cross_month_assignment():
    """Assignment Jan 15 - Feb 15, 50% allocation.
    In January: 12 working days * 4h = 48h
    In February: working days from Feb 1-15 = let's calculate:
    Feb 1 is Sunday, so Feb 2(Mon) to Feb 13(Fri) = 10 days, plus Feb 14(Sat)-15(Sun) = 0.
    Actually Feb 2-6 (5), Feb 9-13 (5) = 10 working days.
    Feb hours = 10 * 4 = 40h.
    """
    jan_hours = calculate_assignment_hours_in_month(
        date(2026, 1, 15), date(2026, 2, 15),
        "percentage", 50.0, 2026, 1,
    )
    assert jan_hours == 48.0

    feb_hours = calculate_assignment_hours_in_month(
        date(2026, 1, 15), date(2026, 2, 15),
        "percentage", 50.0, 2026, 2,
    )
    assert feb_hours == 40.0
