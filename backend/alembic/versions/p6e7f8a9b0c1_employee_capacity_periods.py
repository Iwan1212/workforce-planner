"""employee_capacity_periods

Introduce part-time capacity as effective-dated slices instead of a single
column on `employees`, so changing someone's contract from a given month does
not rewrite occupancy for the months before it.

Each row carries a start date only; it stays in force until the next row
begins. That keeps the timeline gap-free and makes overlaps impossible, at the
cost of one deliberate asymmetry: days *before* an employee's earliest row are
uncovered and count as zero availability, which is how "not employed yet" is
expressed.

Every existing employee is backfilled with a single row starting 1900-01-01 at
100%, i.e. the behaviour hard-coded until now. Nobody becomes retroactively
part-time or retroactively unemployed by running this migration.

Revision ID: p6e7f8a9b0c1
Revises: o5d6e7f8a9b0
Create Date: 2026-08-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'p6e7f8a9b0c1'
down_revision: Union[str, Sequence[str], None] = 'o5d6e7f8a9b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    sa.Enum("percentage", "monthly_hours", name="capacitytype").create(
        op.get_bind(), checkfirst=True
    )
    # create_type=False: the type is created above, so leave create_table to
    # reference it rather than emitting a second CREATE TYPE.
    capacity_type = postgresql.ENUM(
        "percentage", "monthly_hours", name="capacitytype", create_type=False
    )

    op.create_table(
        "employee_capacities",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("employee_id", sa.Integer(), nullable=False),
        sa.Column("valid_from", sa.Date(), nullable=False),
        sa.Column("capacity_type", capacity_type, nullable=False),
        sa.Column("capacity_value", sa.Numeric(7, 2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"], ["employees.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "employee_id", "valid_from", name="uq_capacity_employee_from"
        ),
    )
    op.create_index(
        "ix_employee_capacities_employee_id",
        "employee_capacities",
        ["employee_id"],
    )

    # Backfill: preserve today's behaviour (everyone full time, from always).
    op.execute(
        """
        INSERT INTO employee_capacities
            (employee_id, valid_from, capacity_type, capacity_value)
        SELECT id, DATE '1900-01-01', 'percentage', 100.00
        FROM employees
        """
    )


def downgrade() -> None:
    # Dropping the table returns everyone to an implicit full-time contract.
    # Part-time settings entered after the upgrade cannot be represented in the
    # old schema and are lost.
    op.drop_index(
        "ix_employee_capacities_employee_id", table_name="employee_capacities"
    )
    op.drop_table("employee_capacities")
    sa.Enum(name="capacitytype").drop(op.get_bind(), checkfirst=True)
