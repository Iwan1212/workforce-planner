from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_admin
from app.models.user import User, UserRole
from app.schemas.users import UserCreateRequest, UserListItem, UserUpdateRequest

router = APIRouter(prefix="/api/users", tags=["users"])


async def _email_taken(db: AsyncSession, email: str) -> bool:
    # Google sign-in matches emails ignoring case, so two users differing only
    # in case would be ambiguous.
    result = await db.execute(
        select(User.id).where(func.lower(User.email) == email.lower())
    )
    return result.first() is not None


@router.get("", response_model=list[UserListItem])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.post("", response_model=UserListItem, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    email = body.email.lower()
    if await _email_taken(db, email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Użytkownik z tym adresem email już istnieje",
        )

    try:
        role = UserRole(body.role)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Nieprawidłowa rola. Dozwolone wartości: admin, user, viewer",
        )

    user = User(
        email=email,
        full_name=body.full_name,
        role=role,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserListItem)
async def update_user(
    user_id: int,
    body: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie istnieje",
        )

    if body.email is not None and body.email.lower() != user.email.lower():
        email = body.email.lower()
        if await _email_taken(db, email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Użytkownik z tym adresem email już istnieje",
            )
        user.email = email

    if body.full_name is not None:
        user.full_name = body.full_name

    if body.role is not None:
        if user_id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nie możesz zmienić własnej roli",
            )
        try:
            user.role = UserRole(body.role)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Nieprawidłowa rola. Dozwolone wartości: admin, user, viewer",
            )

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nie możesz usunąć własnego konta",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Użytkownik nie istnieje",
        )

    await db.delete(user)
    await db.commit()
