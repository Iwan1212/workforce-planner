from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.models.user import User

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    """Authenticate user by email and password.

    Handles failed login attempts tracking and account lockout after
    MAX_FAILED_ATTEMPTS consecutive failures (lockout lasts LOCKOUT_MINUTES).
    Returns User on success, None on failure.
    """
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None:
        return None

    if not user.is_active:
        return None

    # Check lockout
    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        return None

    # If lockout expired, reset
    if user.locked_until and user.locked_until <= now:
        user.failed_login_attempts = 0
        user.locked_until = None

    if not verify_password(password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
        await db.commit()
        return None

    # Success — reset counters
    user.failed_login_attempts = 0
    user.locked_until = None
    await db.commit()
    return user
