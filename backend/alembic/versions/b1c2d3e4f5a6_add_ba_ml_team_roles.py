"""add BA and ML team roles

Revision ID: b1c2d3e4f5a6
Revises: a0f7fba494ce
Create Date: 2026-02-19

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "a0f7fba494ce"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE team ADD VALUE IF NOT EXISTS 'BA'")
    op.execute("ALTER TYPE team ADD VALUE IF NOT EXISTS 'ML'")


def downgrade() -> None:
    # PostgreSQL does not support removing values from an enum type
    pass
