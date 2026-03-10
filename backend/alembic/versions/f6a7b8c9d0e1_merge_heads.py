"""merge heads

Revision ID: f6a7b8c9d0e1
Revises: b1e8c3d5f7a2, e5f6a7b8c9d0
Create Date: 2026-03-10 10:00:00.000000

"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = ("b1e8c3d5f7a2", "e5f6a7b8c9d0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
