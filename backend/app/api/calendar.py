from __future__ import annotations

import calendar as cal_mod
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.assignment import Assignment
from app.models.employee import Employee, Team
from app.models.user import User
from app.services.assignment_service import (
    calculate_assignment_hours_in_month,
    calculate_daily_hours,
)
from app.utils.polish_holidays import get_holiday_name, get_polish_holidays
from app.utils.working_days import get_working_days_in_month

router = APIRouter(tags=["calendar"])


@router.get("/api/assignments/timeline")
async def get_timeline(
    start_date: date = Query(...),
    end_date: date = Query(...),
    teams: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return timeline data as per CLAUDE.md contract."""
    # Build employee query
    emp_query = select(Employee).where(Employee.is_deleted == False)
    if teams:
        team_list = [t.strip() for t in teams.split(",") if t.strip()]
        valid_teams = {t.value for t in Team}
        invalid = [t for t in team_list if t not in valid_teams]
        if invalid:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid team value(s): {', '.join(invalid)}. Valid: {', '.join(sorted(valid_teams))}",
            )
        if team_list:
            emp_query = emp_query.where(Employee.team.in_(team_list))
    if search and search.strip():
        q = f"%{search.strip()}%"
        emp_query = emp_query.where(
            (Employee.first_name.ilike(q)) | (Employee.last_name.ilike(q))
        )
    emp_query = emp_query.order_by(Employee.last_name, Employee.first_name)

    emp_result = await db.execute(emp_query)
    employees = emp_result.scalars().all()

    # Collect months in range
    months = []
    current = date(start_date.year, start_date.month, 1)
    while current <= end_date:
        months.append((current.year, current.month))
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)

    # Collect holidays
    holiday_dates = set()
    for year in range(start_date.year, end_date.year + 1):
        holiday_dates.update(get_polish_holidays(year))
    holidays_in_range = sorted(d for d in holiday_dates if start_date <= d <= end_date)

    # Working days per month
    working_days_per_month = {}
    for y, m in months:
        key = f"{y}-{m:02d}"
        working_days_per_month[key] = get_working_days_in_month(y, m)

    # Build employee data
    employee_data = []
    for emp in employees:
        # Fetch assignments overlapping with date range
        a_result = await db.execute(
            select(Assignment)
            .where(
                Assignment.employee_id == emp.id,
                Assignment.start_date <= end_date,
                Assignment.end_date >= start_date,
            )
            .order_by(Assignment.start_date)
        )
        assignments = a_result.scalars().all()

        assignment_list = []
        for a in assignments:
            # Use first month of assignment for daily_hours display
            first_month_year = max(a.start_date, start_date)
            daily = calculate_daily_hours(
                a.allocation_type.value,
                a.allocation_value,
                first_month_year.year,
                first_month_year.month,
            )
            assignment_list.append(
                {
                    "id": a.id,
                    "project_id": a.project_id,
                    "project_name": a.project.name if a.project else "",
                    "project_color": a.project.color if a.project else "#000000",
                    "start_date": a.start_date.isoformat(),
                    "end_date": a.end_date.isoformat(),
                    "allocation_type": a.allocation_type.value,
                    "allocation_value": float(a.allocation_value),
                    "note": a.note,
                    "daily_hours": float(round(daily, 2)),
                }
            )

        # Calculate utilization per month
        utilization = {}
        for y, m in months:
            key = f"{y}-{m:02d}"
            avail = Decimal(str(working_days_per_month[key])) * Decimal("8")
            total = Decimal("0")
            for a in assignments:
                total += calculate_assignment_hours_in_month(
                    a.start_date,
                    a.end_date,
                    a.allocation_type.value,
                    a.allocation_value,
                    y,
                    m,
                )
            pct = float(
                round(
                    (total / avail * Decimal("100")) if avail > 0 else Decimal("0"),
                    1,
                )
            )
            utilization[key] = {
                "percentage": pct,
                "hours": float(round(total, 1)),
                "available_hours": float(round(avail, 1)),
                "is_overbooked": pct > 100,
            }

        employee_data.append(
            {
                "id": emp.id,
                "name": f"{emp.last_name} {emp.first_name}",
                "team": emp.team.value if emp.team else None,
                "assignments": assignment_list,
                "utilization": utilization,
            }
        )

    return {
        "employees": employee_data,
        "holidays": [
            {"date": d.isoformat(), "name": get_holiday_name(d)}
            for d in holidays_in_range
        ],
        "working_days_per_month": working_days_per_month,
    }


@router.get("/api/calendar/holidays/{year}")
async def get_holidays(
    year: int,
    _user: User = Depends(get_current_user),
):
    holidays = get_polish_holidays(year)
    return [{"date": d.isoformat(), "name": get_holiday_name(d)} for d in holidays]


@router.get("/api/calendar/working-days")
async def get_working_days_endpoint(
    start_date: date = Query(...),
    end_date: date = Query(...),
    _user: User = Depends(get_current_user),
):
    from app.utils.working_days import get_working_days

    return {"working_days": get_working_days(start_date, end_date)}
