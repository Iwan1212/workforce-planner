from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin
from app.models.assignment import Assignment
from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    search: Optional[str] = Query(None),
    include_deleted: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(Project)
    if not include_deleted:
        query = query.where(Project.is_deleted == False)
    if search:
        query = query.where(Project.name.ilike(f"%{search}%"))
    query = query.order_by(Project.name)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
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
    _user: User = Depends(require_admin),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check for active assignments
    today = date.today()
    active_query = select(Assignment).where(
        Assignment.project_id == project_id,
        Assignment.end_date >= today,
    )
    active_result = await db.execute(active_query)
    active_assignments = active_result.scalars().all()

    if active_assignments and not confirm:
        return {
            "has_active_assignments": True,
            "active_assignments_count": len(active_assignments),
            "message": "Project has active assignments. Pass ?confirm=true to proceed.",
        }

    # Soft delete project
    project.is_deleted = True

    # Handle assignments like employee deletion:
    # - Future assignments: remove
    # - Ongoing assignments: trim end date to today
    # - Historical assignments: preserve
    for a in active_assignments:
        if a.start_date >= today:
            await db.delete(a)
        else:
            a.end_date = today

    await db.commit()
    return {"deleted": True}
