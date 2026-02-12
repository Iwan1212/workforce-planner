from __future__ import annotations

from datetime import date, timedelta


def _easter_date(year: int) -> date:
    """Compute Easter Sunday using the Anonymous Gregorian algorithm (computus)."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month, day = divmod(h + l - 7 * m + 114, 31)
    return date(year, month, day + 1)


def get_polish_holidays(year: int) -> list[date]:
    """Return all Polish public holidays for a given year."""
    easter = _easter_date(year)

    holidays = [
        # Fixed holidays
        date(year, 1, 1),    # Nowy Rok
        date(year, 1, 6),    # Trzech Króli
        date(year, 5, 1),    # Święto Pracy
        date(year, 5, 3),    # Konstytucja 3 Maja
        date(year, 8, 15),   # Wniebowzięcie NMP
        date(year, 11, 1),   # Wszystkich Świętych
        date(year, 11, 11),  # Święto Niepodległości
        date(year, 12, 25),  # Boże Narodzenie (1. dzień)
        date(year, 12, 26),  # Boże Narodzenie (2. dzień)
        # Movable holidays (Easter-dependent)
        easter,                        # Wielkanoc
        easter + timedelta(days=1),    # Poniedziałek Wielkanocny
        easter + timedelta(days=49),   # Zielone Świątki
        easter + timedelta(days=60),   # Boże Ciało
    ]

    return sorted(holidays)


HOLIDAY_NAMES: dict[tuple[int, int], str] = {
    (1, 1): "Nowy Rok",
    (1, 6): "Trzech Króli",
    (5, 1): "Święto Pracy",
    (5, 3): "Konstytucja 3 Maja",
    (8, 15): "Wniebowzięcie NMP",
    (11, 1): "Wszystkich Świętych",
    (11, 11): "Święto Niepodległości",
    (12, 25): "Boże Narodzenie",
    (12, 26): "Boże Narodzenie (2. dzień)",
}


def get_holiday_name(d: date) -> str:
    """Return the Polish name of a holiday, or empty string if not a named fixed holiday."""
    name = HOLIDAY_NAMES.get((d.month, d.day))
    if name:
        return name
    # Check movable holidays
    easter = _easter_date(d.year)
    if d == easter:
        return "Wielkanoc"
    if d == easter + timedelta(days=1):
        return "Poniedziałek Wielkanocny"
    if d == easter + timedelta(days=49):
        return "Zielone Świątki"
    if d == easter + timedelta(days=60):
        return "Boże Ciało"
    return ""
