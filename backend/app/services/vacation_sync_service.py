from __future__ import annotations

import asyncio
import calendar
import logging
from datetime import date, datetime, timezone

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory
from app.models.app_settings import AppSettings
from app.models.employee import Employee
from app.models.vacation import Vacation
from app.services.calamari_service import CalamariClient

logger = logging.getLogger(__name__)

SYNC_INTERVAL_SECONDS = 3600  # 1 hour


async def get_last_sync_timestamp(db: AsyncSession) -> str | None:
    """Get ISO timestamp of the most recent vacation sync, or None."""
    result = await db.execute(
        select(Vacation.synced_at).order_by(Vacation.synced_at.desc()).limit(1)
    )
    row = result.first()
    return row[0].isoformat() if row and row[0] else None


def add_months(d: date, months: int) -> date:
    """Add (or subtract) months to a date, clamping day to valid range."""
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def get_default_sync_range() -> tuple[date, date]:
    """Return the default date range for vacation sync: -1 month to +6 months from today."""
    today = date.today()
    return add_months(today, -1), add_months(today, 6)


async def get_calamari_config(db: AsyncSession) -> tuple[str | None, str | None]:
    """Read Calamari API key and subdomain from app_settings."""
    result = await db.execute(
        select(AppSettings).where(AppSettings.key.in_(["calamari_api_key", "calamari_subdomain"]))
    )
    settings = {s.key: s.value for s in result.scalars().all()}
    return settings.get("calamari_api_key"), settings.get("calamari_subdomain")


async def sync_vacations(db: AsyncSession, start_date: date, end_date: date) -> int:
    """Fetch leaves from Calamari and upsert into vacations table.

    Returns the number of synced vacation records.
    """
    api_key, subdomain = await get_calamari_config(db)
    if not api_key:
        logger.debug("Calamari not configured, skipping sync")
        return 0

    # Get all employees with email set
    emp_result = await db.execute(
        select(Employee.id, Employee.email).where(
            Employee.email.isnot(None),
            Employee.is_deleted == False,
        )
    )
    email_to_id: dict[str, int] = {}
    employee_emails: list[str] = []
    for emp_id, emp_email in emp_result.all():
        if emp_email:
            email_to_id[emp_email.lower()] = emp_id
            employee_emails.append(emp_email)

    if not employee_emails:
        logger.debug("No employees with email, skipping Calamari sync")
        return 0

    client = CalamariClient(api_key=api_key, subdomain=subdomain)
    leaves = await client.get_approved_leaves(start_date, end_date, employee_emails)
    if not leaves:
        return 0

    # Batch-fetch existing vacations in range (avoids N+1 queries)
    existing_result = await db.execute(
        select(Vacation).where(
            Vacation.start_date <= end_date,
            Vacation.end_date >= start_date,
        )
    )
    existing_map = {v.calamari_id: v for v in existing_result.scalars().all()}

    now = datetime.now(timezone.utc)
    count = 0

    for leave in leaves:
        employee_id = email_to_id.get(leave.employee_email.lower())
        vacation = existing_map.get(leave.calamari_id)

        if vacation:
            vacation.employee_id = employee_id
            vacation.employee_email = leave.employee_email
            vacation.start_date = leave.start_date
            vacation.end_date = leave.end_date
            vacation.leave_type = leave.leave_type
            vacation.synced_at = now
        else:
            db.add(Vacation(
                employee_id=employee_id,
                employee_email=leave.employee_email,
                start_date=leave.start_date,
                end_date=leave.end_date,
                leave_type=leave.leave_type,
                calamari_id=leave.calamari_id,
                synced_at=now,
            ))
        count += 1

    # Remove vacations that are no longer in Calamari for this date range
    fetched_ids = {leave.calamari_id for leave in leaves}
    stale_ids = set(existing_map.keys()) - fetched_ids
    if stale_ids:
        await db.execute(
            delete(Vacation).where(Vacation.calamari_id.in_(stale_ids))
        )

    await db.commit()
    logger.info("Synced %d vacations from Calamari", count)
    return count


async def periodic_vacation_sync(stop_event: asyncio.Event) -> None:
    """Background task: sync vacations every SYNC_INTERVAL_SECONDS."""
    logger.info("Starting periodic vacation sync (every %ds)", SYNC_INTERVAL_SECONDS)

    while not stop_event.is_set():
        try:
            async with async_session_factory() as db:
                api_key, _ = await get_calamari_config(db)
                if api_key:
                    start, end = get_default_sync_range()
                    await sync_vacations(db, start, end)
                else:
                    logger.debug("Calamari not configured, skipping periodic sync")
        except Exception:
            logger.exception("Error during periodic vacation sync")

        # Wait for interval or until stop is signaled
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=SYNC_INTERVAL_SECONDS)
        except asyncio.TimeoutError:
            pass

    logger.info("Periodic vacation sync stopped")
