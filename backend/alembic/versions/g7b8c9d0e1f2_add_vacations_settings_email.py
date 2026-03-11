"""add vacations, app_settings tables and email to employees

Revision ID: g7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-03-10 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "g7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email column to employees
    op.add_column("employees", sa.Column("email", sa.String(255), nullable=True))
    op.create_index("ix_employees_email", "employees", ["email"], unique=True)

    # Create vacations table
    op.create_table(
        "vacations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=True),
        sa.Column("employee_email", sa.String(255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("leave_type", sa.String(50), nullable=False),
        sa.Column("calamari_id", sa.String(255), nullable=False),
        sa.Column(
            "synced_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("calamari_id"),
    )
    op.create_index("ix_vacations_employee_id", "vacations", ["employee_id"])

    # Create app_settings table
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(255), nullable=False),
        sa.Column("value", sa.String(2000), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("key"),
    )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_index("ix_vacations_employee_id", table_name="vacations")
    op.drop_table("vacations")
    op.drop_index("ix_employees_email", table_name="employees")
    op.drop_column("employees", "email")
