from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.assignment import Assignment
from app.models.employee import Employee
from app.models.project import Project
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentResponse, AssignmentUpdate
from app.services.assignment_service import calculate_daily_hours
from app.utils.working_days import get_working_days

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


def _build_response(a: Assignment) -> dict:
    """Build response dict from assignment with project info and daily_hours."""
    today = date.today()
    daily = calculate_daily_hours(
        a.allocation_type.value,
        float(a.allocation_value),
        today.year,
        today.month,
    )
    return {
        "id": a.id,
        "employee_id": a.employee_id,
        "project_id": a.project_id,
        "project_name": a.project.name if a.project else "",
        "project_color": a.project.color if a.project else "#000000",
        "start_date": a.start_date,
        "end_date": a.end_date,
        "allocation_type": a.allocation_type.value,
        "allocation_value": float(a.allocation_value),
        "daily_hours": round(daily, 2),
        "note": a.note,
        "created_at": a.created_at,
    }


@router.get("", response_model=list[AssignmentResponse])
async def list_assignments(
    employee_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(Assignment)
    if employee_id:
        query = query.where(Assignment.employee_id == employee_id)
    if project_id:
        query = query.where(Assignment.project_id == project_id)
    if date_from:
        query = query.where(Assignment.end_date >= date_from)
    if date_to:
        query = query.where(Assignment.start_date <= date_to)
    query = query.order_by(Assignment.start_date)

    result = await db.execute(query)
    assignments = result.scalars().all()
    return [_build_response(a) for a in assignments]


@router.post("", response_model=AssignmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    body: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    # Validate dates
    if body.start_date > body.end_date:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date")

    wd = get_working_days(body.start_date, body.end_date)
    if wd < 1:
        raise HTTPException(status_code=400, detail="Assignment must contain at least 1 working day")

    # Validate employee exists
    emp = await db.execute(select(Employee).where(Employee.id == body.employee_id, Employee.is_deleted == False))
    if not emp.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate project exists
    proj = await db.execute(select(Project).where(Project.id == body.project_id, Project.is_deleted == False))
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    assignment = Assignment(
        employee_id=body.employee_id,
        project_id=body.project_id,
        start_date=body.start_date,
        end_date=body.end_date,
        allocation_type=body.allocation_type,
        allocation_value=body.allocation_value,
        note=body.note,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return _build_response(assignment)


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: int,
    body: AssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if body.employee_id is not None:
        emp = await db.execute(select(Employee).where(Employee.id == body.employee_id, Employee.is_deleted == False))
        if not emp.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Employee not found")
        assignment.employee_id = body.employee_id

    if body.project_id is not None:
        proj = await db.execute(select(Project).where(Project.id == body.project_id, Project.is_deleted == False))
        if not proj.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Project not found")
        assignment.project_id = body.project_id

    if body.start_date is not None:
        assignment.start_date = body.start_date
    if body.end_date is not None:
        assignment.end_date = body.end_date
    if body.allocation_type is not None:
        assignment.allocation_type = body.allocation_type
    if body.allocation_value is not None:
        assignment.allocation_value = body.allocation_value
    if body.note is not None:
        assignment.note = body.note

    # Re-validate dates
    if assignment.start_date > assignment.end_date:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date")

    await db.commit()
    await db.refresh(assignment)
    return _build_response(assignment)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    await db.delete(assignment)
    await db.commit()
