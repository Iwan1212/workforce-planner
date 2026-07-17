"""add teams and technologies tables, migrate team enum to FK

Converts the hardcoded ``team`` Postgres enum column on ``employees`` into a
managed ``teams`` table (1 team per employee via ``team_id`` FK) and adds a
managed ``technologies`` table with a many-to-many ``employee_technologies``
association. Existing enum values are seeded as team rows and remapped.

Revision ID: j0e1f2a3b4c5
Revises: i9d0e1f2a3b4
Create Date: 2026-07-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "j0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "i9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Canonical team values that previously lived in the ``team`` Postgres enum.
_LEGACY_TEAMS = [
    "BA",
    "Backend",
    "DevOps",
    "Frontend",
    "ML",
    "Mobile",
    "PM",
    "QA",
    "UX_UI_Designer",
]


def upgrade() -> None:
    """Upgrade schema."""
    # 1. New reference tables
    op.create_table(
        "teams",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "technologies",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_table(
        "employee_technologies",
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("technology_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["employee_id"], ["employees.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["technology_id"], ["technologies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("employee_id", "technology_id"),
    )

    # 2. New FK column on employees
    op.add_column("employees", sa.Column("team_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_employees_team_id_teams", "employees", "teams", ["team_id"], ["id"]
    )

    # 3. Seed the canonical teams as managed rows
    teams_table = sa.table(
        "teams",
        sa.column("name", sa.String),
        sa.column("is_deleted", sa.Boolean),
    )
    op.bulk_insert(
        teams_table,
        [{"name": name, "is_deleted": False} for name in _LEGACY_TEAMS],
    )

    # 4. Remap employees.team (enum) -> employees.team_id (FK)
    op.execute(
        """
        UPDATE employees AS e
        SET team_id = t.id
        FROM teams AS t
        WHERE e.team IS NOT NULL AND e.team::text = t.name
        """
    )

    # 5. Drop the old enum column and its type
    op.drop_column("employees", "team")
    op.execute("DROP TYPE IF EXISTS team")


def downgrade() -> None:
    """Downgrade schema."""
    # Recreate the enum type and column
    team_enum = sa.Enum(*_LEGACY_TEAMS, name="team")
    team_enum.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "employees",
        sa.Column("team", team_enum, nullable=True),
    )

    # Remap team_id -> team enum by name
    op.execute(
        """
        UPDATE employees AS e
        SET team = t.name::team
        FROM teams AS t
        WHERE e.team_id = t.id AND t.name = ANY(ARRAY[
            'BA','Backend','DevOps','Frontend','ML','Mobile','PM','QA','UX_UI_Designer'
        ])
        """
    )

    op.drop_constraint("fk_employees_team_id_teams", "employees", type_="foreignkey")
    op.drop_column("employees", "team_id")
    op.drop_table("employee_technologies")
    op.drop_table("technologies")
    op.drop_table("teams")
