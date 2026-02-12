from __future__ import annotations

import logging
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.core.security import create_access_token, decode_access_token, hash_password
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    ResetPasswordConfirm,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import authenticate_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy email lub hasło",
        )
    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.post("/reset-password-request")
async def reset_password_request(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate a password reset token. In MVP, logged to console instead of emailed."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return success to prevent email enumeration
    if not user:
        return {"message": "Jeśli konto istnieje, link do resetu został wysłany."}

    # Create a short-lived token (15 min) with purpose claim
    token = create_access_token(
        {"sub": str(user.id), "purpose": "password_reset"},
        expires_delta=timedelta(minutes=15),
    )

    # In MVP, log the token to console
    logger.info(
        "PASSWORD RESET TOKEN for %s: %s",
        user.email,
        token,
    )

    return {"message": "Jeśli konto istnieje, link do resetu został wysłany."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordConfirm,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using the token from reset-password-request."""
    payload = decode_access_token(body.token)
    if not payload or payload.get("purpose") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token jest nieprawidłowy lub wygasł.",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token jest nieprawidłowy.",
        )

    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Hasło musi mieć minimum 8 znaków.",
        )

    user.password_hash = hash_password(body.new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()

    return {"message": "Hasło zostało zmienione."}
