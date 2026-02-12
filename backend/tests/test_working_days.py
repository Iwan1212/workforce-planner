from datetime import date

from app.utils.working_days import get_working_days, get_working_days_in_month


def test_january_2026():
    """January 2026: 31 days, 22 weekdays, minus 2 holidays (Jan 1 Thu, Jan 6 Tue) = 20.
    Wait - Jan 1 2026 is Thursday, Jan 6 is Tuesday. Both are weekdays.
    Weekdays in Jan 2026: Let's count. Jan starts on Thursday.
    Week 1: Thu(1), Fri(2) = 2
    Week 2: Mon(5), Tue(6), Wed(7), Thu(8), Fri(9) = 5
    Week 3: Mon(12), Tue(13), Wed(14), Thu(15), Fri(16) = 5
    Week 4: Mon(19), Tue(20), Wed(21), Thu(22), Fri(23) = 5
    Week 5: Mon(26), Tue(27), Wed(28), Thu(29), Fri(30) = 5
    Total weekdays = 22, minus holidays on Jan 1 (Thu) and Jan 6 (Tue) = 20.
    """
    assert get_working_days_in_month(2026, 1) == 20


def test_february_2026():
    """February 2026: 28 days. Feb 1 is Sunday.
    Week 1: Mon(2), Tue(3), Wed(4), Thu(5), Fri(6) = 5
    Week 2: Mon(9)...Fri(13) = 5
    Week 3: Mon(16)...Fri(20) = 5
    Week 4: Mon(23)...Fri(27) = 5
    Total weekdays = 20, no holidays in Feb = 20.
    """
    assert get_working_days_in_month(2026, 2) == 20


def test_working_days_range():
    """Jan 15-31, 2026. Jan 15 is Thursday.
    Weekdays: 15(Thu), 16(Fri), 19(Mon), 20, 21, 22, 23, 26, 27, 28, 29, 30 = 12
    No holidays in this range.
    """
    wd = get_working_days(date(2026, 1, 15), date(2026, 1, 31))
    assert wd == 12


def test_single_day_working():
    """Jan 5, 2026 is Monday — working day."""
    assert get_working_days(date(2026, 1, 5), date(2026, 1, 5)) == 1


def test_single_day_weekend():
    """Jan 3, 2026 is Saturday — not a working day."""
    assert get_working_days(date(2026, 1, 3), date(2026, 1, 3)) == 0


def test_single_day_holiday():
    """Jan 1, 2026 is Thursday but a holiday — not a working day."""
    assert get_working_days(date(2026, 1, 1), date(2026, 1, 1)) == 0


def test_cross_month_range():
    """Jan 28 - Feb 3, 2026.
    Jan 28(Wed), 29(Thu), 30(Fri) = 3 working days
    Feb 2(Mon), 3(Tue) = 2 working days
    Total = 5
    """
    assert get_working_days(date(2026, 1, 28), date(2026, 2, 3)) == 5
