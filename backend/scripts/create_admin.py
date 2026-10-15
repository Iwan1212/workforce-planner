"""Create the initial admin user from INITIAL_ADMIN_EMAIL.

Sign-in is through Google, so the admin is just a user row whose email matches
the Google account that will sign in. An existing user is left as it is.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import func, select

from app.config import settings
from app.database import async_session_factory
from app.models.user import User, UserRole


async def main():
    email = settings.INITIAL_ADMIN_EMAIL.strip().lower()
    if not email:
        print("INITIAL_ADMIN_EMAIL is not set, skipping admin creation.")
        return

    async with async_session_factory() as db:
        result = await db.execute(select(User).where(func.lower(User.email) == email))
        existing = result.scalar_one_or_none()
        if existing:
            if existing.role != UserRole.admin or not existing.is_active:
                print(
                    f"User {email} already exists but is not an active admin; "
                    "left unchanged."
                )
            else:
                print(f"Admin user {email} already exists.")
            return

        admin = User(
            email=email,
            full_name="Administrator",
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"Admin user created: {email} (sign in with Google)")


if __name__ == "__main__":
    asyncio.run(main())
