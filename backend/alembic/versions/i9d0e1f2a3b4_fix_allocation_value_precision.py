"""fix allocation_value precision for total_hours

Revision ID: i9d0e1f2a3b4
Revises: h8c9d0e1f2a3
Create Date: 2026-03-18 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "i9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "h8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "assignments",
        "allocation_value",
        type_=sa.Numeric(7, 2),
        existing_type=sa.Numeric(5, 2),
    )


def downgrade() -> None:
    op.alter_column(
        "assignments",
        "allocation_value",
        type_=sa.Numeric(5, 2),
        existing_type=sa.Numeric(7, 2),
    )
