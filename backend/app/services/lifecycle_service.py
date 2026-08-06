"""Shared lifecycle operations for archivable resources (projects, employees).

Archiving is a reversible *wind-down*, not a freeze: it stops new work and
closes out work in flight, while leaving history intact. Deleting is permanent
and takes every assignment with it.

Both projects and employees follow identical rules, so the logic lives here
rather than in either API module.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from enum import Enum

from sqlalchemy import ColumnElement, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment


class WindDownAction(str, Enum):
    """What archiving does to a single assignment."""

    KEEP = "keep"
    TRIM = "trim"
    DELETE = "delete"


@dataclass(frozen=True)
class WindDownResult:
    """How many assignments each wind-down branch touched."""

    kept: int
    trimmed: int
    deleted: int


def classify_for_wind_down(
    start_date: date, end_date: date, today: date
) -> WindDownAction:
    """Decide what archiving does to an assignment, relative to `today`.

    - **past** (`end_date < today`) — KEEP, so historical occupancy survives
    - **ongoing** (`start_date <= today <= end_date`) — TRIM to end today
    - **future** (`start_date > today`) — DELETE

    Boundary rules are deliberate: an assignment starting today is ongoing and
    gets trimmed to a single day rather than deleted, and one already ending
    today is ongoing but needs no change, so it reports KEEP.
    """
    if end_date < today:
        return WindDownAction.KEEP
    if start_date > today:
        return WindDownAction.DELETE
    if end_date == today:
        return WindDownAction.KEEP
    return WindDownAction.TRIM


async def wind_down_assignments(
    db: AsyncSession,
    condition: ColumnElement[bool],
    today: date | None = None,
) -> WindDownResult:
    """Apply the archive wind-down to every assignment matching `condition`.

    See `classify_for_wind_down` for the rules. Does not commit — the caller
    owns the transaction.
    """
    today = today or date.today()

    result = await db.execute(select(Assignment).where(condition))
    kept = trimmed = deleted = 0

    for assignment in result.scalars().all():
        action = classify_for_wind_down(
            assignment.start_date, assignment.end_date, today
        )
        if action is WindDownAction.DELETE:
            await db.delete(assignment)
            deleted += 1
        elif action is WindDownAction.TRIM:
            assignment.end_date = today
            trimmed += 1
        else:
            kept += 1

    return WindDownResult(kept=kept, trimmed=trimmed, deleted=deleted)


async def count_assignments(db: AsyncSession, condition: ColumnElement[bool]) -> int:
    """Count assignments matching `condition`."""
    result = await db.execute(
        select(func.count()).select_from(Assignment).where(condition)
    )
    return result.scalar_one()


async def delete_assignments(db: AsyncSession, condition: ColumnElement[bool]) -> int:
    """Hard-delete every assignment matching `condition`, returning the count.

    Used by permanent deletion, which drops past, ongoing and future
    assignments alike. Does not commit — the caller owns the transaction.
    """
    result = await db.execute(delete(Assignment).where(condition))
    return result.rowcount or 0
