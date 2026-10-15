"""google_sign_in_drop_passwords

Sign-in moves to Google: Google checks who the person is, and the app only
decides whether that email may come in. Passwords, the failed-attempt counter
and the lockout window have nothing left to do, so they are dropped.

Accounts themselves stay. An existing user signs in with the Google account
whose email matches theirs; one without such an account can no longer sign in
until an admin changes the email.

Revision ID: r8a9b0c1d2e3
Revises: q7f8a9b0c1d2
Create Date: 2026-10-01

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'r8a9b0c1d2e3'
down_revision: Union[str, Sequence[str], None] = 'q7f8a9b0c1d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "password_hash")
    op.drop_column("users", "failed_login_attempts")
    op.drop_column("users", "locked_until")


def downgrade() -> None:
    # The hashes are gone for good, so the column comes back nullable and
    # every user needs a new password set before password sign-in works again.
    op.add_column(
        "users",
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "failed_login_attempts",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.add_column(
        "users",
        sa.Column("password_hash", sa.String(255), nullable=True),
    )
