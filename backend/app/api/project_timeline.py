from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.assignment import Assignment
from app.models.employee import Employee
from app.models.project import Project
from app.models.user import User
from app.services.assignment_service import calculate_daily_hours
from app.services.capacity_service import assignment_base_daily_hours
from app.utils.polish_holidays import get_holiday_name, get_polish_holidays
from app.utils.working_days import get_working_days_in_month

router = APIRouter(tags=["project-timeline"])


@router.get("/api/projects/timeline")
async def get_project_timeline(
    start_date: date = Query(...),
    end_date: date = Query(...),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return timeline data grouped by project.

    Archived projects are excluded so the project-grouped view stays focused on
    live work; their assignments remain visible in the employee timeline, which
    is what preserves historical occupancy.
    """
    proj_query = select(Project).where(Project.is_archived == False)
    if search and search.strip():
        proj_query = proj_query.where(Project.name.ilike(f"%{search.strip()}%"))
    proj_query = proj_query.order_by(Project.name)

    proj_result = await db.execute(proj_query)
    projects = proj_result.scalars().all()

    # Months in range
    months = []
    current = date(start_date.year, start_date.month, 1)
    while current <= end_date:
        months.append((current.year, current.month))
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)

    # Holidays
    holiday_dates = set()
    for year in range(start_date.year, end_date.year + 1):
        holiday_dates.update(get_polish_holidays(year))
    holidays_in_range = sorted(d for d in holiday_dates if start_date <= d <= end_date)

    # Working days per month
    working_days_per_month = {
        f"{y}-{m:02d}": get_working_days_in_month(y, m) for y, m in months
    }

    # Batch-fetch assignments for all projects in range
    # Assignment.employee is selectin-loaded automatically
    project_ids = [p.id for p in projects]
    assignments_by_project: dict[int, list] = {pid: [] for pid in project_ids}
    if project_ids:
        # No employee-state filter: archived employees stay visible here, so a
        # project keeps the full picture of who worked on it. Placeholder
        # assignments (employee_id IS NULL) are included for the same reason.
        a_result = await db.execute(
            select(Assignment)
            .where(
                Assignment.project_id.in_(project_ids),
                Assignment.start_date <= end_date,
                Assignment.end_date >= start_date,
            )
            .order_by(Assignment.start_date)
        )
        for a in a_result.scalars().all():
            assignments_by_project[a.project_id].append(a)

    # Build project data
    project_data = []
    for proj in projects:
        assignment_list = []
        for a in assignments_by_project[proj.id]:
            first_month_date = max(a.start_date, start_date)
            emp = a.employee
            # A percentage is a share of the assignee's own time, so the same
            # 50% is fewer hours for a part-timer. Placeholders have no
            # assignee and fall back to the full-time norm.
            daily = calculate_daily_hours(
                a.allocation_type.value,
                a.allocation_value,
                first_month_date.year,
                first_month_date.month,
                start_date=a.start_date,
                end_date=a.end_date,
                base_daily_hours=assignment_base_daily_hours(
                    emp.capacities if emp else None, first_month_date
                ),
            )
            assignment_list.append(
                {
                    "id": a.id,
                    "employee_id": emp.id if emp else None,
                    "employee_name": f"{emp.last_name} {emp.first_name}" if emp else None,
                    "employee_team": emp.team.name if emp and emp.team else None,
                    "start_date": a.start_date.isoformat(),
                    "end_date": a.end_date.isoformat(),
                    "allocation_type": a.allocation_type.value,
                    "allocation_value": float(a.allocation_value),
                    "note": a.note,
                    "is_tentative": a.is_tentative,
                    "daily_hours": float(round(daily, 2)),
                }
            )
        project_data.append(
            {
                "id": proj.id,
                "name": proj.name,
                "color": proj.color,
                "assignments": assignment_list,
            }
        )

    return {
        "projects": project_data,
        "holidays": [
            {"date": d.isoformat(), "name": get_holiday_name(d)}
            for d in holidays_in_range
        ],
        "working_days_per_month": working_days_per_month,
    }
