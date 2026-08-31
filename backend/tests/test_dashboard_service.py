"""Unit tests for the dashboard's monthly roll-up.

Fixed dates used below:
- March 2026 has 22 working days (no Polish holidays fall on a weekday), so a
  full-time month is 176 h.
- Week Mon 2026-03-02 .. Fri 2026-03-06 -> 5 working days.
"""

from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from app.models.assignment import AllocationType
from app.models.employee import CapacityType
from app.services.dashboard_service import (
    NO_TEAM_LABEL,
    EmployeeSnapshot,
    compute_month_summary,
    compute_monthly_summaries,
)
from app.services.occupancy_service import (
    TIMELINE_OCCUPANCY_KEYS,
    timeline_occupancy,
)

MARCH_START = date(2026, 3, 1)
MARCH_END = date(2026, 3, 31)
FULL_TIME_MARCH_HOURS = 176.0  # 22 working days x 8 h


def make_capacity(valid_from, capacity_type, value):
    return SimpleNamespace(
        valid_from=valid_from,
        capacity_type=capacity_type,
        capacity_value=Decimal(str(value)),
    )


def make_assignment(start, end, allocation_type, value, is_tentative=False):
    return SimpleNamespace(
        start_date=start,
        end_date=end,
        allocation_type=allocation_type,
        allocation_value=value,
        is_tentative=is_tentative,
    )


def make_vacation(start, end):
    return SimpleNamespace(start_date=start, end_date=end)


FULL_TIME = [make_capacity(date(1900, 1, 1), CapacityType.percentage, 100)]
HALF_TIME = [make_capacity(date(1900, 1, 1), CapacityType.percentage, 50)]


def make_snapshot(
    employee_id=1,
    team_id=1,
    team_name="Backend",
    assignments=None,
    vacations=None,
    capacities=None,
):
    return EmployeeSnapshot(
        employee_id=employee_id,
        team_id=team_id,
        team_name=team_name,
        assignments=assignments or [],
        vacations=vacations or [],
        capacities=capacities if capacities is not None else FULL_TIME,
    )


def march(snapshots, placeholders=()):
    return compute_month_summary(snapshots, placeholders, 2026, 3, set())


# --- totals ---


def test_fully_allocated_full_timer_leaves_nothing_to_distribute():
    snapshot = make_snapshot(
        assignments=[
            make_assignment(MARCH_START, MARCH_END, AllocationType.percentage, 100)
        ]
    )

    result = march([snapshot])

    assert result["month"] == "2026-03"
    assert result["working_days"] == 22
    assert result["capacity_hours"] == FULL_TIME_MARCH_HOURS
    assert result["confirmed_hours"] == FULL_TIME_MARCH_HOURS
    assert result["allocated_hours"] == FULL_TIME_MARCH_HOURS
    assert result["remaining_hours"] == 0.0
    assert result["utilization_percentage"] == 100.0
    assert result["overbooked_employee_count"] == 0


def test_unallocated_capacity_is_reported_as_remaining():
    result = march([make_snapshot()])

    assert result["capacity_hours"] == FULL_TIME_MARCH_HOURS
    assert result["allocated_hours"] == 0.0
    assert result["remaining_hours"] == FULL_TIME_MARCH_HOURS
    assert result["utilization_percentage"] == 0.0


def test_tentative_hours_are_split_out_but_still_count_as_allocated():
    snapshot = make_snapshot(
        assignments=[
            make_assignment(MARCH_START, MARCH_END, AllocationType.percentage, 50),
            make_assignment(
                MARCH_START,
                MARCH_END,
                AllocationType.percentage,
                25,
                is_tentative=True,
            ),
        ]
    )

    result = march([snapshot])

    assert result["confirmed_hours"] == FULL_TIME_MARCH_HOURS * 0.5
    assert result["tentative_hours"] == FULL_TIME_MARCH_HOURS * 0.25
    assert result["allocated_hours"] == FULL_TIME_MARCH_HOURS * 0.75
    assert result["remaining_hours"] == FULL_TIME_MARCH_HOURS * 0.25
    assert result["confirmed_percentage"] == 50.0
    assert result["utilization_percentage"] == 75.0


def test_part_timer_contributes_half_the_capacity():
    result = march([make_snapshot(capacities=HALF_TIME)])

    assert result["capacity_hours"] == FULL_TIME_MARCH_HOURS / 2


def test_vacation_removes_the_persons_own_hours_from_workable_time():
    """A part-timer's vacation week costs 5 x 4 h, not 5 x 8 h."""
    snapshot = make_snapshot(
        capacities=HALF_TIME,
        vacations=[make_vacation(date(2026, 3, 2), date(2026, 3, 6))],
    )

    result = march([snapshot])

    # Capacity is the contract in full; vacation comes out of workable.
    assert result["capacity_hours"] == FULL_TIME_MARCH_HOURS / 2
    assert result["vacation_hours"] == 5 * 4
    assert result["workable_hours"] == FULL_TIME_MARCH_HOURS / 2 - 5 * 4


def test_overbooking_yields_negative_remaining_hours():
    snapshot = make_snapshot(
        assignments=[
            make_assignment(MARCH_START, MARCH_END, AllocationType.percentage, 150)
        ]
    )

    result = march([snapshot])

    assert result["remaining_hours"] == -FULL_TIME_MARCH_HOURS * 0.5
    assert result["utilization_percentage"] == 150.0
    assert result["overbooked_employee_count"] == 1
    assert result["employee_count"] == 1


def test_hours_based_allocation_is_counted_in_full():
    snapshot = make_snapshot(
        assignments=[
            make_assignment(MARCH_START, MARCH_END, AllocationType.monthly_hours, 40)
        ]
    )

    result = march([snapshot])

    assert result["allocated_hours"] == 40.0
    assert result["remaining_hours"] == FULL_TIME_MARCH_HOURS - 40


# --- unassigned demand ---


def test_placeholder_demand_is_reported_separately():
    placeholder = make_assignment(
        MARCH_START, MARCH_END, AllocationType.percentage, 100
    )

    result = march([make_snapshot()], placeholders=[placeholder])

    assert result["unassigned_demand_hours"] == FULL_TIME_MARCH_HOURS
    # It is demand, not allocation: totals and remaining stay untouched.
    assert result["allocated_hours"] == 0.0
    assert result["remaining_hours"] == FULL_TIME_MARCH_HOURS
    assert all("unassigned" not in key for team in result["teams"] for key in team)


def test_no_placeholders_means_zero_demand():
    assert march([make_snapshot()])["unassigned_demand_hours"] == 0.0


# --- team breakdown ---


def test_teams_are_broken_down_and_sum_to_the_totals():
    snapshots = [
        make_snapshot(
            employee_id=1,
            team_id=1,
            team_name="Backend",
            assignments=[
                make_assignment(MARCH_START, MARCH_END, AllocationType.percentage, 100)
            ],
        ),
        make_snapshot(
            employee_id=2,
            team_id=2,
            team_name="Analityka",
            assignments=[
                make_assignment(
                    MARCH_START,
                    MARCH_END,
                    AllocationType.percentage,
                    50,
                    is_tentative=True,
                )
            ],
        ),
        make_snapshot(employee_id=3, team_id=None, team_name=None),
    ]

    result = march(snapshots)

    # Alphabetical, with the no-team bucket last.
    assert [t["team_name"] for t in result["teams"]] == [
        "Analityka",
        "Backend",
        NO_TEAM_LABEL,
    ]
    assert result["teams"][2]["team_id"] is None

    for metric in ("capacity_hours", "confirmed_hours", "tentative_hours"):
        assert round(sum(t[metric] for t in result["teams"]), 1) == result[metric]
    assert sum(t["employee_count"] for t in result["teams"]) == 3

    analytics, backend, no_team = result["teams"]
    assert backend["confirmed_hours"] == FULL_TIME_MARCH_HOURS
    assert analytics["tentative_hours"] == FULL_TIME_MARCH_HOURS * 0.5
    assert analytics["confirmed_hours"] == 0.0
    assert no_team["remaining_hours"] == FULL_TIME_MARCH_HOURS


def test_employees_of_one_team_share_a_single_row():
    snapshots = [
        make_snapshot(employee_id=1, team_id=1, team_name="Backend"),
        make_snapshot(employee_id=2, team_id=1, team_name="Backend"),
    ]

    result = march(snapshots)

    assert len(result["teams"]) == 1
    assert result["teams"][0]["employee_count"] == 2
    assert result["teams"][0]["capacity_hours"] == FULL_TIME_MARCH_HOURS * 2


def test_no_employees_yields_zeroed_metrics_rather_than_a_division_error():
    result = march([])

    assert result["capacity_hours"] == 0.0
    assert result["utilization_percentage"] == 0.0
    assert result["remaining_hours"] == 0.0
    assert result["teams"] == []


# --- multiple months ---


def test_summaries_follow_the_requested_month_order():
    snapshot = make_snapshot(
        assignments=[
            make_assignment(
                date(2026, 3, 1), date(2026, 3, 31), AllocationType.percentage, 100
            )
        ]
    )

    summaries = compute_monthly_summaries(
        [snapshot], [], [(2026, 2), (2026, 3), (2026, 4)], set()
    )

    assert [s["month"] for s in summaries] == ["2026-02", "2026-03", "2026-04"]
    # The assignment only covers March, so the neighbouring months are free.
    assert summaries[0]["allocated_hours"] == 0.0
    assert summaries[1]["allocated_hours"] == FULL_TIME_MARCH_HOURS
    assert summaries[2]["allocated_hours"] == 0.0


# --- the timeline contract must not gain the split ---


def test_timeline_occupancy_exposes_only_the_original_keys():
    a = make_assignment(MARCH_START, MARCH_END, AllocationType.percentage, 50)

    occupancy = timeline_occupancy([a], [], MARCH_START, MARCH_END, set(), FULL_TIME)

    assert set(occupancy) == set(TIMELINE_OCCUPANCY_KEYS)
    assert occupancy["hours"] == FULL_TIME_MARCH_HOURS * 0.5


# --- vacation hours and placeholder counts ---


def test_the_hour_figures_add_up_to_capacity():
    """capacity = confirmed + tentative + vacation + remaining, always."""
    snapshots = [
        make_snapshot(
            employee_id=1,
            assignments=[
                make_assignment(MARCH_START, MARCH_END, AllocationType.percentage, 60),
                make_assignment(
                    MARCH_START,
                    MARCH_END,
                    AllocationType.percentage,
                    20,
                    is_tentative=True,
                ),
            ],
            vacations=[make_vacation(date(2026, 3, 2), date(2026, 3, 6))],
        ),
        make_snapshot(employee_id=2, team_id=2, team_name="Analityka"),
    ]

    result = march(snapshots)

    for scope in (result, *result["teams"]):
        assert round(
            scope["confirmed_hours"]
            + scope["tentative_hours"]
            + scope["vacation_hours"]
            + scope["remaining_hours"],
            1,
        ) == scope["capacity_hours"]


def test_the_equation_holds_when_hours_commitments_survive_a_vacation():
    """An hours-based commitment kept across vacation days overflows the month,
    which shows up as negative remaining rather than a broken equation."""
    snapshot = make_snapshot(
        assignments=[
            make_assignment(
                MARCH_START, MARCH_END, AllocationType.monthly_hours, 176
            )
        ],
        vacations=[make_vacation(date(2026, 3, 2), date(2026, 3, 6))],
    )

    result = march([snapshot])

    assert result["capacity_hours"] == FULL_TIME_MARCH_HOURS
    assert result["vacation_hours"] == 40.0
    assert result["workable_hours"] == 136.0
    assert result["confirmed_hours"] == FULL_TIME_MARCH_HOURS
    assert result["remaining_hours"] == -40.0
    assert result["utilization_percentage"] == 129.4
    assert (
        result["confirmed_hours"]
        + result["tentative_hours"]
        + result["vacation_hours"]
        + result["remaining_hours"]
    ) == result["capacity_hours"]


def test_vacation_hours_are_zero_without_vacations():
    assert march([make_snapshot()])["vacation_hours"] == 0.0


def test_vacation_hours_are_also_broken_down_per_team():
    snapshots = [
        make_snapshot(
            employee_id=1,
            team_id=1,
            team_name="Backend",
            vacations=[make_vacation(date(2026, 3, 2), date(2026, 3, 6))],
        ),
        make_snapshot(employee_id=2, team_id=2, team_name="Analityka"),
    ]

    result = march(snapshots)

    analytics, backend = result["teams"]
    assert backend["vacation_hours"] == 40.0
    assert analytics["vacation_hours"] == 0.0
    assert result["vacation_hours"] == 40.0


def test_only_placeholders_overlapping_the_month_are_counted():
    inside = make_assignment(MARCH_START, MARCH_END, AllocationType.percentage, 100)
    outside = make_assignment(
        date(2026, 5, 1), date(2026, 5, 31), AllocationType.percentage, 100
    )

    result = march([make_snapshot()], placeholders=[inside, outside])

    assert result["unassigned_assignment_count"] == 1


def test_placeholder_count_is_zero_without_placeholders():
    assert march([make_snapshot()])["unassigned_assignment_count"] == 0


def test_fetch_bounds_cover_the_reported_months_in_full():
    from app.api.dashboard import _fetch_bounds, _months_in_range

    # A mid-month range still reports whole months, so the fetch has to
    # reach back to the 1st and forward to the month's last day — otherwise
    # an assignment ending before the raw start_date silently drops out.
    months = _months_in_range(date(2026, 3, 15), date(2026, 4, 20))
    assert months == [(2026, 3), (2026, 4)]
    assert _fetch_bounds(months) == (date(2026, 3, 1), date(2026, 4, 30))

    # Month-aligned input is unchanged, leap February included.
    months = _months_in_range(date(2028, 1, 1), date(2028, 2, 29))
    assert _fetch_bounds(months) == (date(2028, 1, 1), date(2028, 2, 29))

    # December rollover.
    months = _months_in_range(date(2026, 12, 10), date(2027, 1, 5))
    assert _fetch_bounds(months) == (date(2026, 12, 1), date(2027, 1, 31))
