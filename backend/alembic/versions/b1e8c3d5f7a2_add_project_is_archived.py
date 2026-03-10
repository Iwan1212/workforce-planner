"""add project is_archived

Revision ID: b1e8c3d5f7a2
Revises: a0f7fba494ce
Create Date: 2026-02-16 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1e8c3d5f7a2"
down_revision: Union[str, None] = "a0f7fba494ce"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
    )


def downgrade() -> None:
    op.drop_column("projects", "is_archived")
