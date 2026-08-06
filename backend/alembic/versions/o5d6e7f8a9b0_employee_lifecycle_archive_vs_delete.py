"""employee_lifecycle_archive_vs_delete

Mirror the project lifecycle rework on employees: archive (reversible
wind-down) and delete (permanent) replace soft delete, so `is_deleted` gives
way to `is_archived`.

Existing soft-deleted employees are **converted to archived**, not
hard-deleted. Unlike projects, their assignments are already filtered out of
the employee timeline today, so nothing visible changes either way — the
choice is a product one: keep the rows so their history stays available under
the project timeline and the archived list filter, and let deletion be a
deliberate act rather than a side effect of a migration.

Revision ID: o5d6e7f8a9b0
Revises: n4c5d6e7f8a9
Create Date: 2026-08-06 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'o5d6e7f8a9b0'
down_revision: Union[str, Sequence[str], None] = 'n4c5d6e7f8a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "employees",
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    # Preserve soft-deleted employees as archived instead of dropping them.
    op.execute(
        "UPDATE employees SET is_archived = true WHERE is_deleted = true"
    )
    op.drop_column("employees", "is_deleted")


def downgrade() -> None:
    # Reinstating the column cannot recover which archived employees were once
    # soft-deleted; that distinction is gone. Everything comes back as not
    # deleted, which keeps every employee reachable rather than resurrecting
    # rows into a hidden state.
    op.add_column(
        "employees",
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.drop_column("employees", "is_archived")
