from __future__ import annotations

import calendar as cal_mod
from dataclasses import dataclass, field
from datetime import date
from typing import Sequence

from app.services.occupancy_service import compute_occupancy_for_period
from app.utils.working_days import get_working_days_in_month

# Label for the bucket holding employees who belong to no team. Kept here rather
# than on the frontend so the grouping and its name travel together.
NO_TEAM_LABEL = "Bez zespołu"


@dataclass(frozen=True)
class EmployeeSnapshot:
    """Everything the aggregate needs about one employee, already loaded.

    Keeping this a plain value object means the whole month/team roll-up is a
    pure function: the API layer does the querying, the service does the maths.
    """

    employee_id: int
    team_id: int | None
    team_name: str | None
    assignments: list
    vacations: list
    capacities: list


@dataclass
class _Bucket:
    """Running totals for one scope, either the whole month or a single team."""

    capacity_hours: float = 0.0
    workable_hours: float = 0.0
    vacation_hours: float = 0.0
    confirmed_hours: float = 0.0
    tentative_hours: float = 0.0
    employee_count: int = 0
    overbooked_employee_count: int = 0

    def add(self, occupancy: dict) -> None:
        # The engine's "available" is net of vacation; here that is the
        # workable figure, and availability is the contract in full.
        self.workable_hours += occupancy["available_hours"]
        self.vacation_hours += occupancy["vacation_hours"]
        self.capacity_hours += (
            occupancy["available_hours"] + occupancy["vacation_hours"]
        )
        self.confirmed_hours += occupancy["confirmed_hours"]
        self.tentative_hours += occupancy["tentative_hours"]
        self.employee_count += 1
        if occupancy["is_overbooked"]:
            self.overbooked_employee_count += 1

    def as_metrics(self) -> dict:
        """The shared metric shape used by both the totals and the team rows.

        The hour figures form one equation, so a month reads as a whole:

            capacity = confirmed + tentative + vacation + remaining

        `capacity` is every contracted hour on the month's working days, i.e.
        the full headcount capacity. Vacation is one of the things that
        capacity was spent on, alongside confirmed and tentative work, rather
        than something quietly missing from the total. Deliberately not called
        "available": only `remaining` is actually free to plan against.

        `workable` is capacity minus vacation: the hours somebody could still
        actually work. Occupancy is measured against it, which is what keeps
        the percentages equal to the timeline's occupancy badges.
        """
        capacity = round(self.capacity_hours, 1)
        workable = round(self.workable_hours, 1)
        vacation = round(self.vacation_hours, 1)
        confirmed = round(self.confirmed_hours, 1)
        tentative = round(self.tentative_hours, 1)
        allocated = round(confirmed + tentative, 1)
        return {
            "capacity_hours": capacity,
            "workable_hours": workable,
            "vacation_hours": vacation,
            "confirmed_hours": confirmed,
            "tentative_hours": tentative,
            "allocated_hours": allocated,
            # Deliberately not clamped at zero: overbooking is a warning, never
            # a block, so a negative figure is the honest answer. An hours-based
            # commitment kept across vacation days is exactly such a case.
            "remaining_hours": round(workable - allocated, 1),
            "utilization_percentage": _ratio(allocated, workable),
            "confirmed_percentage": _ratio(confirmed, workable),
            "employee_count": self.employee_count,
            "overbooked_employee_count": self.overbooked_employee_count,
        }


@dataclass
class _TeamBucket:
    team_id: int | None
    team_name: str
    bucket: _Bucket = field(default_factory=_Bucket)


def _ratio(value: float, base: float) -> float:
    """Percentage of `base`, or 0.0 when there is no availability to divide by."""
    if base <= 0:
        return 0.0
    return round(value / base * 100, 1)


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    return date(year, month, 1), date(year, month, cal_mod.monthrange(year, month)[1])


def compute_month_summary(
    snapshots: Sequence[EmployeeSnapshot],
    placeholder_assignments: Sequence,
    year: int,
    month: int,
    holiday_dates: set[date],
) -> dict:
    """Aggregate one month's availability and allocation across employees.

    Availability and allocation come from the same engine the occupancy badges
    use, so the dashboard cannot drift from the timeline: contracted hours on
    working days minus vacations, with tentative work split out of the total.

    Unassigned demand (placeholder assignments) is reported separately and is
    not part of `allocated_hours` or of any team row: it belongs to no employee,
    so folding it in would make the team filter incoherent and would hide the
    demand as soon as a team was selected.
    """
    total = _Bucket()
    teams: dict[int | None, _TeamBucket] = {}

    period_start, period_end = _month_bounds(year, month)

    for snapshot in snapshots:
        occupancy = compute_occupancy_for_period(
            snapshot.assignments,
            snapshot.vacations,
            period_start,
            period_end,
            holiday_dates,
            snapshot.capacities,
        )
        total.add(occupancy)

        team = teams.get(snapshot.team_id)
        if team is None:
            team = _TeamBucket(
                team_id=snapshot.team_id,
                team_name=snapshot.team_name or NO_TEAM_LABEL,
            )
            teams[snapshot.team_id] = team
        team.bucket.add(occupancy)

    unassigned = 0.0
    unassigned_count = sum(
        1
        for a in placeholder_assignments
        if a.start_date <= period_end and a.end_date >= period_start
    )
    if placeholder_assignments:
        # No employee means no contract to scale a percentage against, so the
        # engine falls back to the full-time norm. Its availability figure is
        # meaningless here and is ignored.
        placeholder_occupancy = compute_occupancy_for_period(
            list(placeholder_assignments),
            [],
            period_start,
            period_end,
            holiday_dates,
            None,
        )
        unassigned = round(placeholder_occupancy["hours"], 1)

    return {
        "month": f"{year}-{month:02d}",
        "working_days": get_working_days_in_month(year, month),
        **total.as_metrics(),
        "unassigned_demand_hours": unassigned,
        "unassigned_assignment_count": unassigned_count,
        "teams": [
            {"team_id": t.team_id, "team_name": t.team_name, **t.bucket.as_metrics()}
            for t in _sorted_teams(teams.values())
        ],
    }


def _sorted_teams(teams) -> list[_TeamBucket]:
    """Teams alphabetically, with the no-team bucket last."""
    return sorted(teams, key=lambda t: (t.team_id is None, t.team_name.lower()))


def compute_monthly_summaries(
    snapshots: Sequence[EmployeeSnapshot],
    placeholder_assignments: Sequence,
    months: Sequence[tuple[int, int]],
    holiday_dates: set[date],
) -> list[dict]:
    """Month summaries for every (year, month) pair, in the given order."""
    return [
        compute_month_summary(
            snapshots, placeholder_assignments, year, month, holiday_dates
        )
        for year, month in months
    ]


__all__ = [
    "NO_TEAM_LABEL",
    "EmployeeSnapshot",
    "compute_month_summary",
    "compute_monthly_summaries",
]
