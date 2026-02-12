from __future__ import annotations

import calendar
from datetime import date, timedelta

from app.utils.polish_holidays import get_polish_holidays


def get_working_days_list(start_date: date, end_date: date) -> list[date]:
    """Return list of working days (Mon-Fri, excluding Polish holidays) in range [start, end]."""
    holidays = set()
    for year in range(start_date.year, end_date.year + 1):
        holidays.update(get_polish_holidays(year))

    result = []
    current = start_date
    while current <= end_date:
        if current.weekday() < 5 and current not in holidays:
            result.append(current)
        current += timedelta(days=1)
    return result


def get_working_days(start_date: date, end_date: date) -> int:
    """Count working days (Mon-Fri, excluding Polish holidays) in range [start, end]."""
    return len(get_working_days_list(start_date, end_date))


def get_working_days_in_month(year: int, month: int) -> int:
    """Count working days in a given month."""
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])
    return get_working_days(first_day, last_day)
