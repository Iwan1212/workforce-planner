"""project_lifecycle_archive_vs_delete

Rework the project lifecycle into two distinct operations: archive (reversible
wind-down) and delete (permanent). Soft delete is removed — deletion is now a
hard delete of the project and all of its assignments — so `is_deleted` becomes
obsolete and is dropped.

Existing soft-deleted projects are **converted to archived**, not hard-deleted.
They are invisible in the UI today, yet their assignments still render in the
employee timeline (that query never filtered on project state), so deleting
them would silently erase historical occupancy that users can currently see.
Archiving matches the behaviour they already have and surfaces them in the
project list, where they can be reviewed and deleted deliberately.

Revision ID: n4c5d6e7f8a9
Revises: m3b4c5d6e7f8
Create Date: 2026-08-06 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'n4c5d6e7f8a9'
down_revision: Union[str, Sequence[str], None] = 'm3b4c5d6e7f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Preserve soft-deleted projects as archived instead of dropping them.
    op.execute(
        "UPDATE projects SET is_archived = true WHERE is_deleted = true"
    )
    op.drop_column("projects", "is_deleted")


def downgrade() -> None:
    # The column comes back, but which archived projects were once soft-deleted
    # is not recoverable — that distinction is gone for good. Everything is
    # restored as not deleted, which keeps every project reachable rather than
    # resurrecting rows into a hidden state.
    op.add_column(
        "projects",
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
