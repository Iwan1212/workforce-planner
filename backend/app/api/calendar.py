from __future__ import annotations

import calendar as cal_mod
from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin
from app.models.assignment import Assignment
from app.models.employee import Employee, Team
from app.models.user import User
from app.models.vacation import Vacation
from app.services.assignment_service import (
    calculate_assignment_hours_in_month,
    calculate_daily_hours,
)
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

        # Calculate utilization per month (accounting for vacation days)
        utilization = {}
        for y, m in months:
            key = f"{y}-{m:02d}"
            wd = working_days_per_month[key]
            avail = Decimal(str(wd)) * Decimal("8")

            # Count vacation working days in this month
            vacation_days = _count_vacation_working_days(emp_vacations, y, m)
            vacation_hours = Decimal(str(vacation_days)) * Decimal("8")
            effective_avail = avail - vacation_hours

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
                    (total / effective_avail * Decimal("100"))
                    if effective_avail > 0
                    else Decimal("0"),
                    1,
                )
            )
            utilization[key] = {
                "percentage": pct,
                "hours": float(round(total, 1)),
                "available_hours": float(round(effective_avail, 1)),
                "vacation_days": vacation_days,
                "is_overbooked": pct > 100,
            }

        employee_data.append(
            {
                "id": emp.id,
                "name": f"{emp.last_name} {emp.first_name}",
                "team": emp.team.value if emp.team else None,
                "assignments": assignment_list,
                "vacations": vacation_list,
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
        "vacation_sync_status": sync_status,
    }


def _count_vacation_working_days(vacations: list, year: int, month: int) -> int:
    """Count working days covered by vacations in a specific month."""
    if not vacations:
        return 0

    month_start = date(year, month, 1)
    month_end = date(year, month, cal_mod.monthrange(year, month)[1])
    total = 0

    for v in vacations:
        overlap_start = max(v.start_date, month_start)
        overlap_end = min(v.end_date, month_end)
        if overlap_start > overlap_end:
            continue
        total += get_working_days(overlap_start, overlap_end)

    return total


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
