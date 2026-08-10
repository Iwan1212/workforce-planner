"""backfill_fk_indexes_teams_technologies

Catch-up migration for two FK indexes that were added retroactively to the
already-merged revision j0e1f2a3b4c5 instead of in a new revision. Databases
that had applied j0e1f2a3b4c5 before that edit never received the indexes and
never will, since Alembic considers the revision done.

Both statements are idempotent: databases created from the edited
j0e1f2a3b4c5 already have the indexes and are left untouched.

Revision ID: m3b4c5d6e7f8
Revises: l2a3b4c5d6e7
Create Date: 2026-08-06 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'm3b4c5d6e7f8'
down_revision: Union[str, Sequence[str], None] = 'l2a3b4c5d6e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_employees_team_id "
        "ON employees (team_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_employee_technologies_technology_id "
        "ON employee_technologies (technology_id)"
    )


def downgrade() -> None:
    # Left as a no-op on purpose: j0e1f2a3b4c5 also creates these indexes, so
    # dropping them here would leave databases created from that revision
    # without indexes their own migration is responsible for.
    pass
