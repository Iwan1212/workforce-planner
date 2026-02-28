from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin
from app.models.assignment import Assignment
from app.models.employee import Employee, Team
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=list[EmployeeResponse])
async def list_employees(
    teams: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(Employee)
    if not include_deleted:
        query = query.where(Employee.is_deleted == False)
    if teams:
        team_list = [t.strip() for t in teams.split(",") if t.strip()]
        valid_teams = {t.value for t in Team}
        for t in team_list:
            if t not in valid_teams:
                raise HTTPException(status_code=400, detail=f"Invalid team value: {t}")
        query = query.where(Employee.team.in_(team_list))
    if search:
        pattern = f"%{search}%"
        query = query.where(
            (Employee.first_name.ilike(pattern))
            | (Employee.last_name.ilike(pattern))
            | (sa_func.concat(Employee.last_name, " ", Employee.first_name).ilike(pattern))
        )
    query = query.order_by(Employee.last_name, Employee.first_name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    body: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    if body.team and body.team not in [t.value for t in Team]:
        raise HTTPException(status_code=400, detail="Invalid team value")

    existing = await db.execute(
        select(Employee).where(
            sa_func.lower(Employee.first_name) == body.first_name.lower(),
            sa_func.lower(Employee.last_name) == body.last_name.lower(),
            Employee.is_deleted == False,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pracownik o tym imieniu i nazwisku już istnieje",
        )

    employee = Employee(
        first_name=body.first_name,
        last_name=body.last_name,
        team=body.team,
    )
    db.add(employee)
    await db.commit()
    await db.refresh(employee)
    return employee


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    body: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if body.first_name is not None:
        employee.first_name = body.first_name
    if body.last_name is not None:
        employee.last_name = body.last_name
    if body.team is not None:
        if body.team and body.team not in [t.value for t in Team]:
            raise HTTPException(status_code=400, detail="Invalid team value")
        employee.team = body.team if body.team else None

    await db.commit()
    await db.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_200_OK)
async def delete_employee(
    employee_id: int,
    confirm: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check for active assignments (end_date >= today)
    today = date.today()
    active_query = select(Assignment).where(
        Assignment.employee_id == employee_id,
        Assignment.end_date >= today,
    )
    active_result = await db.execute(active_query)
    active_assignments = active_result.scalars().all()

    if active_assignments and not confirm:
        return {
            "has_active_assignments": True,
            "active_assignments_count": len(active_assignments),
            "active_assignments": [
                {
                    "id": a.id,
                    "project_id": a.project_id,
                    "start_date": a.start_date.isoformat(),
                    "end_date": a.end_date.isoformat(),
                }
                for a in active_assignments
            ],
            "message": "Employee has active assignments. Pass ?confirm=true to proceed.",
        }

    # Soft delete employee
    employee.is_deleted = True

    # Delete future assignments
    for a in active_assignments:
        if a.start_date >= today:
            await db.delete(a)
        else:
            # Trim ongoing assignment to today
            a.end_date = today

    await db.commit()
    return {"deleted": True}
