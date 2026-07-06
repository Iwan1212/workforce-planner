from __future__ import annotations

import calendar as cal_mod
from datetime import date, timedelta
from decimal import Decimal
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin
from app.models.assignment import AllocationType, Assignment
from app.models.employee import Employee, Team
from app.models.user import User
from app.models.vacation import Vacation
from app.services.assignment_service import calculate_daily_hours
from app.services.vacation_sync_service import (
    get_calamari_config,
    get_default_sync_range,
    get_last_sync_timestamp,
    sync_vacations,
)
from app.utils.polish_holidays import get_holiday_name, get_polish_holidays
from app.utils.working_days import get_working_days, get_working_days_in_month

router = APIRouter(tags=["calendar"])


@router.get("/api/assignments/timeline")
async def get_timeline(
    start_date: date = Query(...),
    end_date: date = Query(...),
    teams: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    granularity: Literal["monthly", "weekly"] = Query("monthly"),
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

    # Fetch all vacations in range
    vac_result = await db.execute(
        select(Vacation).where(
            Vacation.start_date <= end_date,
            Vacation.end_date >= start_date,
        )
    )
    all_vacations = vac_result.scalars().all()

    # Group vacations by employee_id
    vacations_by_employee: dict[int, list] = {}
    for v in all_vacations:
        if v.employee_id is not None:
            vacations_by_employee.setdefault(v.employee_id, []).append(v)

    # Batch-fetch all assignments in range (avoids N+1 queries)
    emp_ids = [emp.id for emp in employees]
    assignments_by_employee: dict[int, list] = {eid: [] for eid in emp_ids}
    if emp_ids:
        a_result = await db.execute(
            select(Assignment)
            .where(
                Assignment.employee_id.in_(emp_ids),
                Assignment.start_date <= end_date,
                Assignment.end_date >= start_date,
            )
            .order_by(Assignment.start_date)
        )
        for a in a_result.scalars().all():
            assignments_by_employee[a.employee_id].append(a)

    # Get vacation sync status
    sync_status = await _get_vacation_sync_status(db)

    # Build employee data
    employee_data = []
    for emp in employees:
        assignments = assignments_by_employee[emp.id]

        assignment_list = []
        for a in assignments:
            # Use first month of assignment for daily_hours display
            first_month_year = max(a.start_date, start_date)
            daily = calculate_daily_hours(
                a.allocation_type.value,
                a.allocation_value,
                first_month_year.year,
                first_month_year.month,
                start_date=a.start_date,
                end_date=a.end_date,
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
                    "is_tentative": a.is_tentative,
                    "daily_hours": float(round(daily, 2)),
                }
            )

        # Employee vacations
        emp_vacations = vacations_by_employee.get(emp.id, [])
        vacation_list = [
            {
                "start_date": v.start_date.isoformat(),
                "end_date": v.end_date.isoformat(),
                "leave_type": v.leave_type,
                "employee_email": v.employee_email,
                "synced_at": v.synced_at.isoformat() if v.synced_at else None,
            }
            for v in emp_vacations
        ]

        # Calculate occupancy per period (month or week)
        occupancy: dict = {}
        if granularity == "weekly":
            for week_start, week_end in _get_weeks_in_range(start_date, end_date):
                key = _week_key(week_start)
                occupancy[key] = _compute_occupancy_for_period(
                    assignments, emp_vacations, week_start, week_end, holiday_dates,
                )
        else:
            for y, m in months:
                key = f"{y}-{m:02d}"
                period_start = date(y, m, 1)
                period_end = date(y, m, cal_mod.monthrange(y, m)[1])
                occupancy[key] = _compute_occupancy_for_period(
                    assignments, emp_vacations, period_start, period_end, holiday_dates,
                )

        employee_data.append(
            {
                "id": emp.id,
                "name": f"{emp.last_name} {emp.first_name}",
                "team": emp.team.value if emp.team else None,
                "assignments": assignment_list,
                "vacations": vacation_list,
                "occupancy": occupancy,
            }
        )

    return {
        "employees": employee_data,
        "holidays": [
            {"date": d.isoformat(), "name": get_holiday_name(d)}
            for d in holidays_in_range
        ],
        "working_days_per_month": working_days_per_month,
        "vacation_sync_status": sync_status,
    }


def _week_key(week_start: date) -> str:
    """Generate week key matching frontend format: 'w-YYYY-WW'."""
    _, iso_week, _ = week_start.isocalendar()
    return f"w-{week_start.year}-{iso_week}"


def _get_weeks_in_range(start_date: date, end_date: date) -> list[tuple[date, date]]:
    """Return (week_start, week_end) pairs for all ISO weeks touching the range.

    The first window is aligned to the Monday of start_date's week so that
    windows are always true ISO weeks (Monday–Sunday), matching the frontend's
    Monday-based week grid regardless of which weekday start_date falls on.
    """
    weeks = []
    current = start_date - timedelta(days=start_date.weekday())
    while current <= end_date:
        week_end = current + timedelta(days=6)
        weeks.append((current, week_end))
        current = week_end + timedelta(days=1)
    return weeks


def _compute_occupancy_for_period(
    assignments: list,
    vacations: list,
    period_start: date,
    period_end: date,
    holiday_dates: set,
) -> dict:
    """Compute occupancy metrics for a period (week or month).

    Denominator: net_available = (working_days - vacation_days) * 8
    Numerator:
      - percentage allocations: hours only on non-vacation working days
      - hours-based allocations: full committed hours across all working days
        (vacation reduces net_available, not the commitment)
    """
    net_available_days = 0
    hours_numerator = Decimal("0")

    d = period_start
    while d <= period_end:
        if d.weekday() >= 5 or d in holiday_dates:
            d += timedelta(days=1)
            continue

        is_vacation = any(v.start_date <= d <= v.end_date for v in vacations)

        if not is_vacation:
            net_available_days += 1

        for a in assignments:
            if not (a.start_date <= d <= a.end_date):
                continue
            daily = calculate_daily_hours(
                a.allocation_type.value,
                a.allocation_value,
                d.year,
                d.month,
                start_date=a.start_date,
                end_date=a.end_date,
            )
            if a.allocation_type == AllocationType.percentage:
                if not is_vacation:
                    hours_numerator += daily
            else:
                hours_numerator += daily

        d += timedelta(days=1)

    net_available = Decimal(str(net_available_days)) * Decimal("8")

    if net_available == 0:
        pct = 0.0
    else:
        pct = float(round(hours_numerator / net_available * Decimal("100"), 1))

    return {
        "percentage": pct,
        "hours": float(round(hours_numerator, 1)),
        "available_hours": float(round(net_available, 1)),
        "is_overbooked": pct > 100,
    }


async def _get_vacation_sync_status(db: AsyncSession) -> dict:
    """Get vacation sync status for the timeline response."""
    api_key, _ = await get_calamari_config(db)
    is_configured = bool(api_key)

    return {
        "last_synced_at": await get_last_sync_timestamp(db) if is_configured else None,
        "is_configured": is_configured,
    }


@router.get("/api/calendar/vacations")
async def get_vacations(
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Return cached vacations for a date range."""
    result = await db.execute(
        select(Vacation).where(
            Vacation.start_date <= end_date,
            Vacation.end_date >= start_date,
        )
    )
    vacations = result.scalars().all()
    return [
        {
            "id": v.id,
            "employee_id": v.employee_id,
            "employee_email": v.employee_email,
            "start_date": v.start_date.isoformat(),
            "end_date": v.end_date.isoformat(),
            "leave_type": v.leave_type,
            "synced_at": v.synced_at.isoformat() if v.synced_at else None,
        }
        for v in vacations
    ]


@router.post("/api/calendar/vacations/sync")
async def trigger_vacation_sync(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
):
    """Manually trigger vacation sync (admin only)."""
    start, end = get_default_sync_range()
    count = await sync_vacations(db, start, end)
    return {"status": "ok", "synced": count}


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
    return {"working_days": get_working_days(start_date, end_date)}
