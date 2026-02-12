"""Create initial admin user."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select

from app.core.security import hash_password
from app.database import async_session_factory
from app.models.user import User, UserRole


async def main():
    async with async_session_factory() as db:
        result = await db.execute(select(User).where(User.email == "admin@workforce.local"))
        existing = result.scalar_one_or_none()
        if existing:
            print("Admin user already exists.")
            return

        admin = User(
            email="admin@workforce.local",
            password_hash=hash_password("Admin123!"),
            full_name="Administrator",
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print("Admin user created: admin@workforce.local / Admin123!")


if __name__ == "__main__":
    asyncio.run(main())
