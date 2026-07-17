from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func as sa_func
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db, require_admin, require_editor
from app.models.employee import Technology
from app.models.user import User
from app.schemas.technology import (
    TechnologyCreate,
    TechnologyResponse,
    TechnologyUpdate,
)

router = APIRouter(prefix="/api/technologies", tags=["technologies"])


@router.get("", response_model=list[TechnologyResponse])
async def list_technologies(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Technology).order_by(Technology.name))
    return result.scalars().all()


@router.post("", response_model=TechnologyResponse, status_code=status.HTTP_201_CREATED)
async def create_technology(
    body: TechnologyCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    existing = await db.execute(
        select(Technology).where(
            sa_func.lower(Technology.name) == body.name.lower()
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Technologia o tej nazwie już istnieje",
        )

    technology = Technology(name=body.name)
    db.add(technology)
    await db.commit()
    await db.refresh(technology)
    return technology


@router.patch("/{technology_id}", response_model=TechnologyResponse)
async def update_technology(
    technology_id: int,
    body: TechnologyUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_editor),
):
    result = await db.execute(
        select(Technology).where(Technology.id == technology_id)
    )
    technology = result.scalar_one_or_none()
    if not technology:
        raise HTTPException(status_code=404, detail="Technology not found")

    existing = await db.execute(
        select(Technology).where(
            sa_func.lower(Technology.name) == body.name.lower(),
            Technology.id != technology_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Technologia o tej nazwie już istnieje",
        )

    technology.name = body.name
    await db.commit()
    await db.refresh(technology)
    return technology


@router.delete("/{technology_id}", status_code=status.HTTP_200_OK)
async def delete_technology(
    technology_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_admin),
):
    result = await db.execute(
        select(Technology).where(Technology.id == technology_id)
    )
    technology = result.scalar_one_or_none()
    if not technology:
        raise HTTPException(status_code=404, detail="Technology not found")

    # Hard delete: removing the row cascades to employee_technologies
    # (ON DELETE CASCADE), so the tag disappears from every employee.
    await db.delete(technology)
    await db.commit()
    return {"deleted": True}
