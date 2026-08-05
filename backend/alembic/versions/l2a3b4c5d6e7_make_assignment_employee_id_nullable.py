"""make_assignment_employee_id_nullable

Allow NULL employee_id on assignments to support "placeholder" assignments —
planned work on a project that is not yet allocated to a specific person.

Revision ID: l2a3b4c5d6e7
Revises: k1f2a3b4c5d6
Create Date: 2026-07-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'l2a3b4c5d6e7'
down_revision: Union[str, Sequence[str], None] = 'k1f2a3b4c5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'assignments',
        'employee_id',
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    # Placeholder assignments (employee_id IS NULL) cannot exist under the old
    # schema; remove them before restoring the NOT NULL constraint.
    op.execute("DELETE FROM assignments WHERE employee_id IS NULL")
    op.alter_column(
        'assignments',
        'employee_id',
        existing_type=sa.Integer(),
        nullable=False,
    )
