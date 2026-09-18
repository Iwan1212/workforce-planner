"""project_is_internal

Marks a project as internal work: recruitment, our own product, sales and PM
time. The point is to be able to see how much planned time never reaches a
client, so the flag lives on the project rather than on each assignment.

Existing projects are backfilled as client work (false), which is the answer
for every project in the table today. The internal ones are marked by hand
afterwards, and until they are, the internal figure reads zero.

Revision ID: q7f8a9b0c1d2
Revises: p6e7f8a9b0c1
Create Date: 2026-09-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'q7f8a9b0c1d2'
down_revision: Union[str, Sequence[str], None] = 'p6e7f8a9b0c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "is_internal",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    # Which projects were internal is lost with the column; nothing else
    # depends on it, so everything simply reads as client work again.
    op.drop_column("projects", "is_internal")
