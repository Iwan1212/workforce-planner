from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func as sa_func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin, require_editor
from app.models.assignment import Assignment
from app.models.employee import CapacityType, Employee, EmployeeCapacity, Team, Technology
from app.models.user import User
from app.schemas.employee import (
    CapacityCreate,
    CapacityResponse,
    CapacityUpdate,
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
)
from app.services.capacity_service import baseline_capacity
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


async def _ensure_email_available(
    db: AsyncSession, email: Optional[str], exclude_id: Optional[int] = None
) -> None:
    """Reject an email already used by another employee, with 409 rather than 500.

    `employees.email` is unique in the database, so without this check a
    collision surfaces as an unhandled IntegrityError. Archived employees keep
    their address reserved, since the constraint does not care about state.
    """
    if not email:
        return
    query = select(Employee).where(sa_func.lower(Employee.email) == email.lower())
    if exclude_id is not None:
        query = query.where(Employee.id != exclude_id)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Pracownik z tym adresem email już istnieje",
        )


async def _commit_handling_email_conflict(db: AsyncSession) -> None:
    """Commit, translating a concurrent email-uniqueness violation into 409.

    _ensure_email_available checks first, but two parallel requests can both
    pass that SELECT; the unique constraint is the last line of defense and
    would otherwise surface as a 500 with the session left in a broken state.
    """
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        if "email" in str(exc.orig).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Pracownik z tym adresem email już istnieje",
            ) from exc
        raise


async def _validate_team_id(db: AsyncSession, team_id: Optional[int]) -> None:
    """Ensure a team_id references an existing team (None is allowed)."""
    if team_id is None:
        return
    result = await db.execute(select(Team).where(Team.id == team_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Invalid team_id")


async def _get_employee(db: AsyncSession, employee_id: int) -> Employee:
    """Load an employee or raise 404."""
    result = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = result.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Nie znaleziono pracownika")
    return employee


async def _reload_capacities(
    db: AsyncSession, employee_id: int
) -> list[EmployeeCapacity]:
    """Return an employee's capacity entries, oldest first."""
    result = await db.execute(
        select(EmployeeCapacity)
        .where(EmployeeCapacity.employee_id == employee_id)
        .order_by(EmployeeCapacity.valid_from)
    )
    return list(result.scalars().all())


async def _ensure_valid_from_available(
    db: AsyncSession,
    employee_id: int,
    valid_from,
    exclude_id: Optional[int] = None,
) -> None:
    """Reject a second capacity entry starting on the same day.

    Two entries sharing a start date would make the one in force ambiguous, and
    the database constraint would surface it as a 500.
    """
    query = select(EmployeeCapacity).where(
        EmployeeCapacity.employee_id == employee_id,
        EmployeeCapacity.valid_from == valid_from,
    )
    if exclude_id is not None:
        query = query.where(EmployeeCapacity.id != exclude_id)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Okres zaczynający się w tym dniu już istnieje",
        )


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

    # Archived employees keep their name reserved, mirroring project names and
    # the email rule below. They are reachable under the "archived" list filter,
    # so the conflict is diagnosable and can be resolved by unarchiving.
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

    await _ensure_email_available(db, body.email)

    # Start everyone full time from always. New records often describe people
    # who have been here for years, so their existing assignments must count
    # from day one; narrowing the first period is how an employment start gets
    # recorded, and that is a deliberate act.
    employee = Employee(
        first_name=body.first_name,
        last_name=body.last_name,
        team_id=body.team_id,
        email=body.email,
        technologies=technologies,
        capacities=[baseline_capacity()],
    )
    db.add(employee)
    await _commit_handling_email_conflict(db)
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
        raise HTTPException(status_code=404, detail="Nie znaleziono pracownika")

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
        await _ensure_email_available(db, body.email, exclude_id=employee_id)
        employee.email = body.email if body.email else None

    await _commit_handling_email_conflict(db)
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
        raise HTTPException(status_code=404, detail="Nie znaleziono pracownika")

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


@router.get("/{employee_id}/capacities", response_model=list[CapacityResponse])
async def list_capacities(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List an employee's contracted capacity periods, oldest first.

    Each entry stays in force until the next one starts. Time before the first
    entry is intentionally uncovered and counts as zero availability.
    """
    await _get_employee(db, employee_id)
    return await _reload_capacities(db, employee_id)


@router.post(
    "/{employee_id}/capacities",
    response_model=list[CapacityResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_capacity(
    employee_id: int,
    body: CapacityCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    """Add a capacity period, which ends the preceding one automatically.

    Occupancy for the affected months is recomputed on the next timeline read;
    earlier months keep the capacity that was in force back then.
    """
    await _get_employee(db, employee_id)
    await _ensure_valid_from_available(db, employee_id, body.valid_from)

    db.add(
        EmployeeCapacity(
            employee_id=employee_id,
            valid_from=body.valid_from,
            capacity_type=CapacityType(body.capacity_type),
            capacity_value=body.capacity_value,
        )
    )
    await db.commit()
    return await _reload_capacities(db, employee_id)


@router.patch(
    "/{employee_id}/capacities/{capacity_id}", response_model=list[CapacityResponse]
)
async def update_capacity(
    employee_id: int,
    capacity_id: int,
    body: CapacityUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    """Edit a capacity period, including its start date.

    Moving the earliest period's start date is how an employment start is
    recorded: everything before it becomes uncovered, hence unavailable.
    """
    await _get_employee(db, employee_id)
    result = await db.execute(
        select(EmployeeCapacity).where(
            EmployeeCapacity.id == capacity_id,
            EmployeeCapacity.employee_id == employee_id,
        )
    )
    capacity = result.scalar_one_or_none()
    if not capacity:
        raise HTTPException(status_code=404, detail="Nie znaleziono okresu wymiaru etatu")

    await _ensure_valid_from_available(
        db, employee_id, body.valid_from, exclude_id=capacity_id
    )

    capacity.valid_from = body.valid_from
    capacity.capacity_type = CapacityType(body.capacity_type)
    capacity.capacity_value = body.capacity_value

    await db.commit()
    return await _reload_capacities(db, employee_id)


@router.delete(
    "/{employee_id}/capacities/{capacity_id}", response_model=list[CapacityResponse]
)
async def delete_capacity(
    employee_id: int,
    capacity_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    """Remove a capacity period; the preceding one extends over the gap.

    The last remaining period cannot be removed — an employee with no periods
    at all would have zero availability for all time, which no occupancy figure
    could express meaningfully.
    """
    await _get_employee(db, employee_id)
    capacities = await _reload_capacities(db, employee_id)

    target = next((c for c in capacities if c.id == capacity_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Nie znaleziono okresu wymiaru etatu")
    if len(capacities) == 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nie można usunąć jedynego okresu wymiaru etatu",
        )

    await db.delete(target)
    await db.commit()
    return await _reload_capacities(db, employee_id)


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
        raise HTTPException(status_code=404, detail="Nie znaleziono pracownika")

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
        raise HTTPException(status_code=404, detail="Nie znaleziono pracownika")

    employee.is_archived = False
    await db.commit()
    await db.refresh(employee)
    return employee
