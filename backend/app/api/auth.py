from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import get_current_user, get_db
from app.core.rate_limit import login_rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
)
from app.models.user import User
from app.schemas.auth import (
    AuthConfigResponse,
    GoogleLoginRequest,
    RefreshRequest,
    ThemeUpdate,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import (
    AccountNotAllowed,
    GoogleUnavailable,
    InvalidGoogleCredential,
    authenticate_google,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/config", response_model=AuthConfigResponse)
async def get_auth_config():
    """Public settings the login screen needs before anyone is signed in."""
    return AuthConfigResponse(google_client_id=settings.GOOGLE_CLIENT_ID or None)


@router.post(
    "/google", response_model=TokenResponse, dependencies=[Depends(login_rate_limit)]
)
async def login_with_google(
    body: GoogleLoginRequest, db: AsyncSession = Depends(get_db)
):
    """Exchange a Google ID token for this app's access and refresh tokens."""
    try:
        user = await authenticate_google(db, body.credential)
    except AccountNotAllowed as exc:
        logger.info("Google sign-in refused: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="To konto Google nie ma dostępu do aplikacji. Skontaktuj się z administratorem.",
        )
    except InvalidGoogleCredential as exc:
        logger.info("Invalid Google credential: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Logowanie przez Google nie powiodło się. Spróbuj ponownie.",
        )
    except GoogleUnavailable as exc:
        logger.warning("Could not reach Google to verify sign-in: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nie udało się połączyć z Google. Spróbuj ponownie za chwilę.",
        )

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_access_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nieprawidłowy refresh token",
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Użytkownik nie istnieje lub jest nieaktywny",
        )

    new_access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    return TokenResponse(access_token=new_access_token, refresh_token=new_refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me/theme", response_model=UserResponse)
async def update_theme(
    body: ThemeUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the authenticated user's theme preference."""
    if body.theme not in ("light", "dark"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Dozwolone wartości: 'light', 'dark'",
        )
    user.theme = body.theme
    await db.commit()
    await db.refresh(user)
    return user
