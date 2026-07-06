import pytest
from datetime import date

from app.services.assignment_service import calculate_daily_hours


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


# --- total_hours tests ---

def test_total_hours_daily():
    """620h over Jan–Mar 2026 (62 working days) = 10h/day."""
    result = calculate_daily_hours(
        "total_hours", 620.0, 2026, 1,
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 31),
    )
    assert result == 10.0


def test_total_hours_requires_dates():
    """total_hours without start/end dates must raise ValueError."""
    with pytest.raises(ValueError, match="start_date and end_date are required"):
        calculate_daily_hours("total_hours", 100.0, 2026, 1)


def test_total_hours_zero_working_days():
    """total_hours over a weekend (0 working days) returns 0."""
    result = calculate_daily_hours(
        "total_hours", 100.0, 2026, 1,
        start_date=date(2026, 1, 3),
        end_date=date(2026, 1, 4),
    )
    assert result == 0.0


def test_total_hours_single_working_day():
    """8h total over 1 working day = 8h/day."""
    result = calculate_daily_hours(
        "total_hours", 8.0, 2026, 1,
        start_date=date(2026, 1, 5),
        end_date=date(2026, 1, 5),
    )
    assert result == 8.0
