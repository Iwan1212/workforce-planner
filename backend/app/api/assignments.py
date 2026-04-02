from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_editor
from app.models.assignment import Assignment
from app.models.employee import Employee
from app.models.project import Project
from app.models.user import User
from app.schemas.assignment import (
    AssignmentCreate,
    AssignmentResponse,
    AssignmentUpdate,
)
from app.services.assignment_service import calculate_daily_hours
from app.utils.working_days import get_working_days

router = APIRouter(prefix="/api/assignments", tags=["assignments"])


def _build_response(a: Assignment) -> dict:
    """Build response dict from assignment with project info and daily_hours."""
    today = date.today()
    daily = calculate_daily_hours(
        a.allocation_type.value,
        a.allocation_value,
        today.year,
        today.month,
        start_date=a.start_date,
        end_date=a.end_date,
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
        "daily_hours": float(round(daily, 2)),
        "note": a.note,
        "is_tentative": a.is_tentative,
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
    _user: User = Depends(require_editor),
):
    # Validate dates
    if body.start_date > body.end_date:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date")

    wd = get_working_days(body.start_date, body.end_date)
    if wd < 1:
        raise HTTPException(
            status_code=400, detail="Assignment must contain at least 1 working day"
        )

    # Validate employee exists
    emp = await db.execute(
        select(Employee).where(
            Employee.id == body.employee_id, Employee.is_deleted == False
        )
    )
    if not emp.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Employee not found")

    # Validate project exists
    proj = await db.execute(
        select(Project).where(
            Project.id == body.project_id, Project.is_deleted == False
        )
    )
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
        is_tentative=body.is_tentative,
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
    _user: User = Depends(require_editor),
):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if body.employee_id is not None:
        emp = await db.execute(
            select(Employee).where(
                Employee.id == body.employee_id, Employee.is_deleted == False
            )
        )
        if not emp.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Employee not found")
        assignment.employee_id = body.employee_id

    if body.project_id is not None:
        proj = await db.execute(
            select(Project).where(
                Project.id == body.project_id, Project.is_deleted == False
            )
        )
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
    if "note" in body.model_fields_set:
        assignment.note = body.note.strip() if body.note else None
    if body.is_tentative is not None:
        assignment.is_tentative = body.is_tentative

    # Re-validate dates
    if assignment.start_date > assignment.end_date:
        raise HTTPException(status_code=400, detail="start_date must be <= end_date")

    # Validate at least 1 working day (same check as create)
    wd = get_working_days(assignment.start_date, assignment.end_date)
    if wd < 1:
        raise HTTPException(
            status_code=400, detail="Assignment must contain at least 1 working day"
        )

    await db.commit()
    await db.refresh(assignment)
    return _build_response(assignment)


@router.post("/{assignment_id}/split", response_model=list[AssignmentResponse])
async def split_assignment(
    assignment_id: int,
    split_date: date = Query(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    """Split assignment into two at split_date. Original becomes start→split_date-1, new is split_date→end."""
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if split_date <= assignment.start_date or split_date > assignment.end_date:
        raise HTTPException(
            status_code=400,
            detail="split_date must be strictly after start_date and not after end_date",
        )

    original_end = split_date - timedelta(days=1)

    wd1 = get_working_days(assignment.start_date, original_end)
    wd2 = get_working_days(split_date, assignment.end_date)
    if wd1 < 1 or wd2 < 1:
        raise HTTPException(
            status_code=400,
            detail="Obie części muszą zawierać co najmniej 1 dzień roboczy",
        )

    new_assignment = Assignment(
        employee_id=assignment.employee_id,
        project_id=assignment.project_id,
        start_date=split_date,
        end_date=assignment.end_date,
        allocation_type=assignment.allocation_type,
        allocation_value=assignment.allocation_value,
        note=assignment.note,
        is_tentative=assignment.is_tentative,
    )
    assignment.end_date = original_end

    db.add(new_assignment)
    await db.commit()
    await db.refresh(assignment)
    await db.refresh(new_assignment)
    return [_build_response(assignment), _build_response(new_assignment)]


@router.post(
    "/{assignment_id}/duplicate",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def duplicate_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    """Duplicate an assignment with identical parameters and dates."""
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Validate employee and project are not soft-deleted
    emp = await db.execute(
        select(Employee).where(
            Employee.id == assignment.employee_id, Employee.is_deleted == False
        )
    )
    if not emp.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cannot duplicate: employee has been deleted")

    proj = await db.execute(
        select(Project).where(
            Project.id == assignment.project_id, Project.is_deleted == False
        )
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Cannot duplicate: project has been deleted")

    new_assignment = Assignment(
        employee_id=assignment.employee_id,
        project_id=assignment.project_id,
        start_date=assignment.start_date,
        end_date=assignment.end_date,
        allocation_type=assignment.allocation_type,
        allocation_value=assignment.allocation_value,
        note=assignment.note,
        is_tentative=assignment.is_tentative,
    )
    db.add(new_assignment)
    await db.commit()
    await db.refresh(new_assignment)
    return _build_response(new_assignment)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    await db.delete(assignment)
    await db.commit()
