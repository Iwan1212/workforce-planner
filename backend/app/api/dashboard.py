from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.assignment import Assignment
from app.models.employee import Employee, Technology
from app.models.user import User
from app.models.vacation import Vacation
from app.services.dashboard_service import EmployeeSnapshot, compute_monthly_summaries
from app.utils.polish_holidays import get_polish_holidays
from app.utils.query_params import parse_id_csv

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# A year of months is what the tab shows; anything wider is a sign of a bad
# request rather than a real need, and the day-by-day roll-up is not free.
MAX_MONTHS = 24


def _months_in_range(start_date: date, end_date: date) -> list[tuple[int, int]]:
    months = []
    current = date(start_date.year, start_date.month, 1)
    while current <= end_date:
        months.append((current.year, current.month))
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)
    return months


@router.get("/monthly")
async def get_monthly_summary(
    start_date: date = Query(...),
    end_date: date = Query(...),
    team_ids: Optional[str] = Query(None),
    technology_ids: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Monthly availability and allocation totals, with a per-team breakdown.

    Same population and filters as the employee timeline, so the two views
    always describe the same people.
    """
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="end_date must not precede start_date")

    months = _months_in_range(start_date, end_date)
    if len(months) > MAX_MONTHS:
        raise HTTPException(
            status_code=400, detail=f"Range must not exceed {MAX_MONTHS} months"
        )

    # Archived employees leave this view, matching the employee timeline.
    emp_query = select(Employee).where(Employee.is_archived == False)
    if team_ids:
        ids = parse_id_csv(team_ids)
        if ids:
            emp_query = emp_query.where(Employee.team_id.in_(ids))
    if technology_ids:
        ids = parse_id_csv(technology_ids)
        if ids:
            emp_query = emp_query.where(
                Employee.technologies.any(Technology.id.in_(ids))
            )

    emp_result = await db.execute(emp_query)
    employees = emp_result.scalars().all()
    emp_ids = [emp.id for emp in employees]

    # Batch-fetch assignments and vacations once for the whole range (no N+1).
    assignments_by_employee: dict[int, list] = {eid: [] for eid in emp_ids}
    if emp_ids:
        a_result = await db.execute(
            select(Assignment).where(
                Assignment.employee_id.in_(emp_ids),
                Assignment.start_date <= end_date,
                Assignment.end_date >= start_date,
            )
        )
        for a in a_result.scalars().all():
            assignments_by_employee[a.employee_id].append(a)

    vac_result = await db.execute(
        select(Vacation).where(
            Vacation.start_date <= end_date,
            Vacation.end_date >= start_date,
        )
    )
    vacations_by_employee: dict[int, list] = {}
    for v in vac_result.scalars().all():
        if v.employee_id is not None:
            vacations_by_employee.setdefault(v.employee_id, []).append(v)

    # Work that has no assignee yet: reported as unassigned demand, never
    # filtered by team, since it belongs to nobody.
    ph_result = await db.execute(
        select(Assignment).where(
            Assignment.employee_id.is_(None),
            Assignment.start_date <= end_date,
            Assignment.end_date >= start_date,
        )
    )
    placeholder_assignments = ph_result.scalars().all()

    holiday_dates: set[date] = set()
    for year in range(start_date.year, end_date.year + 1):
        holiday_dates.update(get_polish_holidays(year))

    snapshots = [
        EmployeeSnapshot(
            employee_id=emp.id,
            team_id=emp.team_id,
            team_name=emp.team.name if emp.team else None,
            assignments=assignments_by_employee[emp.id],
            vacations=vacations_by_employee.get(emp.id, []),
            capacities=list(emp.capacities),
        )
        for emp in employees
    ]

    return {
        "months": compute_monthly_summaries(
            snapshots, placeholder_assignments, months, holiday_dates
        )
    }
