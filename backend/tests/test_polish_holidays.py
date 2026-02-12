from datetime import date

from app.utils.polish_holidays import _easter_date, get_polish_holidays


def test_easter_2026():
    """Easter 2026 is April 5."""
    assert _easter_date(2026) == date(2026, 4, 5)


def test_easter_2025():
    """Easter 2025 is April 20."""
    assert _easter_date(2025) == date(2025, 4, 20)


def test_easter_2024():
    """Easter 2024 is March 31."""
    assert _easter_date(2024) == date(2024, 3, 31)


def test_holidays_count_2026():
    """Poland has 13 public holidays."""
    holidays = get_polish_holidays(2026)
    assert len(holidays) == 13


def test_fixed_holidays_present_2026():
    holidays = get_polish_holidays(2026)
    assert date(2026, 1, 1) in holidays    # Nowy Rok
    assert date(2026, 1, 6) in holidays    # Trzech Króli
    assert date(2026, 5, 1) in holidays    # Święto Pracy
    assert date(2026, 5, 3) in holidays    # Konstytucja 3 Maja
    assert date(2026, 8, 15) in holidays   # Wniebowzięcie
    assert date(2026, 11, 1) in holidays   # Wszystkich Świętych
    assert date(2026, 11, 11) in holidays  # Niepodległość
    assert date(2026, 12, 25) in holidays  # BN 1
    assert date(2026, 12, 26) in holidays  # BN 2


def test_movable_holidays_2026():
    """2026 Easter = April 5 -> Mon Easter = Apr 6, Pentecost = May 24, Corpus Christi = Jun 4."""
    holidays = get_polish_holidays(2026)
    assert date(2026, 4, 5) in holidays    # Wielkanoc
    assert date(2026, 4, 6) in holidays    # Poniedziałek Wielkanocny
    assert date(2026, 5, 24) in holidays   # Zielone Świątki
    assert date(2026, 6, 4) in holidays    # Boże Ciało


def test_holidays_sorted():
    holidays = get_polish_holidays(2026)
    assert holidays == sorted(holidays)
