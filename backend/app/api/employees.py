from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin, require_editor
from app.models.assignment import Assignment
from app.models.employee import Employee, Team, Technology
from app.models.user import User
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate
from app.services.lifecycle_service import (
    count_assignments,
    delete_assignments,
    wind_down_assignments,
)
from app.utils.query_params import parse_id_csv

router = APIRouter(prefix="/api/employees", tags=["employees"])


async def _resolve_technologies(
    db: AsyncSession, technology_ids: list[int]
) -> list[Technology]:
    """Load Technology rows for the given ids, 400 if any is missing."""
    if not technology_ids:
        return []
    unique_ids = list(dict.fromkeys(technology_ids))
    result = await db.execute(
        select(Technology).where(Technology.id.in_(unique_ids))
    )
    techs = result.scalars().all()
    found_ids = {t.id for t in techs}
    missing = [tid for tid in unique_ids if tid not in found_ids]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid technology id(s): {', '.join(map(str, missing))}",
        )
    return list(techs)


async def _validate_team_id(db: AsyncSession, team_id: Optional[int]) -> None:
    """Ensure a team_id references an existing team (None is allowed)."""
    if team_id is None:
        return
    result = await db.execute(select(Team).where(Team.id == team_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid team_id")


@router.get("", response_model=list[EmployeeResponse])
async def list_employees(
    team_ids: Optional[str] = Query(None),
    technology_ids: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    employee_status: Literal["active", "archived", "all"] = Query(
        "active", alias="status"
    ),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(Employee)
    if employee_status == "active":
        query = query.where(Employee.is_archived == False)
    elif employee_status == "archived":
        query = query.where(Employee.is_archived == True)
    # "all" — no filter
    if team_ids:
        ids = parse_id_csv(team_ids)
        if ids:
            query = query.where(Employee.team_id.in_(ids))
    if technology_ids:
        ids = parse_id_csv(technology_ids)
        if ids:
            query = query.where(
                Employee.technologies.any(Technology.id.in_(ids))
            )
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
    _user: User = Depends(require_editor),
):
    await _validate_team_id(db, body.team_id)
    technologies = await _resolve_technologies(db, body.technology_ids)

    # Archived employees still count as taken, mirroring project names. They are
    # reachable under the "archived" list filter, so the conflict is diagnosable.
    existing = await db.execute(
        select(Employee).where(
            sa_func.lower(Employee.first_name) == body.first_name.lower(),
            sa_func.lower(Employee.last_name) == body.last_name.lower(),
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
        team_id=body.team_id,
        email=body.email,
        technologies=technologies,
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
    _user: User = Depends(require_editor),
):
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if body.first_name is not None:
        employee.first_name = body.first_name
    if body.last_name is not None:
        employee.last_name = body.last_name
    if "team_id" in body.model_fields_set:
        await _validate_team_id(db, body.team_id)
        employee.team_id = body.team_id
    if body.technology_ids is not None:
        employee.technologies = await _resolve_technologies(db, body.technology_ids)
    if body.email is not None:
        employee.email = body.email if body.email else None

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
    """Permanently delete an employee together with every one of their assignments.

    Irreversible, and it drops past, ongoing and future assignments alike.
    Archiving is the reversible alternative: it winds the employee down while
    preserving history.
    """
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    assignment_filter = Assignment.employee_id == employee_id
    assignments_count = await count_assignments(db, assignment_filter)

    if assignments_count and not confirm:
        return {
            "has_assignments": True,
            "assignments_count": assignments_count,
            "message": (
                "Employee has assignments that will be permanently deleted. "
                "Pass ?confirm=true to proceed."
            ),
        }

    deleted_assignments = await delete_assignments(db, assignment_filter)
    await db.delete(employee)
    await db.commit()
    return {"deleted": True, "deleted_assignments": deleted_assignments}


@router.post("/{employee_id}/archive", response_model=EmployeeResponse)
async def archive_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    """Archive an employee and wind down their assignments.

    Past assignments are preserved, ongoing ones are trimmed to end today, and
    future ones are deleted. The employee stays in the database and their
    history remains visible in the project timeline.
    """
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.is_archived = True
    await wind_down_assignments(db, Assignment.employee_id == employee_id)

    await db.commit()
    await db.refresh(employee)
    return employee


@router.post("/{employee_id}/unarchive", response_model=EmployeeResponse)
async def unarchive_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    """Re-enable an archived employee for new assignments.

    Does not restore assignments that archiving trimmed or deleted — archiving
    is a wind-down, not a freeze.
    """
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    employee.is_archived = False
    await db.commit()
    await db.refresh(employee)
    return employee
