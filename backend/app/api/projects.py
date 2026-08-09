from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin, require_editor
from app.models.assignment import Assignment
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.services.lifecycle_service import (
    count_assignments,
    delete_assignments,
    wind_down_assignments,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    search: Optional[str] = Query(None),
    project_status: Literal["active", "archived", "all"] = Query("active", alias="status"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(Project)
    if project_status == "active":
        query = query.where(Project.is_archived == False)
    elif project_status == "archived":
        query = query.where(Project.is_archived == True)
    # "all" — no filter
    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
    query = query.order_by(Project.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    # Check unique name (case-insensitive)
    existing = await db.execute(
        select(Project).where(sa_func.lower(Project.name) == body.name.lower())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Projekt o tej nazwie już istnieje",
        )

    project = Project(name=body.name, color=body.color)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    body: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Nie znaleziono projektu")

    if body.name is not None:
        # Check unique name (case-insensitive, excluding self)
        existing = await db.execute(
            select(Project).where(
                sa_func.lower(Project.name) == body.name.lower(),
                Project.id != project_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Projekt o tej nazwie już istnieje",
            )
        project.name = body.name

    if body.color is not None:
        project.color = body.color

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
async def delete_project(
    project_id: int,
    confirm: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
):
    """Permanently delete a project together with every one of its assignments.

    Irreversible, and it drops past, ongoing and future assignments alike.
    Archiving is the reversible alternative: it winds the project down while
    preserving history.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Nie znaleziono projektu")

    assignment_filter = Assignment.project_id == project_id
    assignments_count = await count_assignments(db, assignment_filter)

    if assignments_count and not confirm:
        return {
            "has_assignments": True,
            "assignments_count": assignments_count,
            "message": (
                "Project has assignments that will be permanently deleted. "
                "Pass ?confirm=true to proceed."
            ),
        }

    deleted_assignments = await delete_assignments(db, assignment_filter)
    await db.delete(project)
    await db.commit()
    return {"deleted": True, "deleted_assignments": deleted_assignments}


@router.post("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    """Archive a project and wind down its assignments.

    Past assignments are preserved, ongoing ones are trimmed to end today, and
    future ones are deleted. The project stays in the database and its history
    remains visible in the employee timeline.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Nie znaleziono projektu")

    project.is_archived = True
    await wind_down_assignments(db, Assignment.project_id == project_id)

    await db.commit()
    await db.refresh(project)
    return project


@router.post("/{project_id}/unarchive", response_model=ProjectResponse)
async def unarchive_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    """Re-enable an archived project for new assignments.

    Does not restore assignments that archiving trimmed or deleted — archiving
    is a wind-down, not a freeze.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Nie znaleziono projektu")

    project.is_archived = False
    await db.commit()
    await db.refresh(project)
    return project
