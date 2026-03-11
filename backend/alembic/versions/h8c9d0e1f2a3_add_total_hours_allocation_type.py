"""add total_hours allocation type

Revision ID: h8c9d0e1f2a3
Revises: g7b8c9d0e1f2
Create Date: 2026-03-11 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "h8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "g7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE allocationtype ADD VALUE IF NOT EXISTS 'total_hours'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values
    pass
