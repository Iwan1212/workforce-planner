from __future__ import annotations

import asyncio
from typing import Any, Optional

from google.auth import exceptions as google_exceptions
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user import User


class InvalidGoogleCredential(Exception):
    """The credential is not a valid Google ID token issued for this app."""


class GoogleUnavailable(Exception):
    """Google's signing keys could not be fetched to check the credential."""


class AccountNotAllowed(Exception):
    """Google vouched for the account, but it may not sign in to this app."""


def _verify_with_google(credential: str, client_id: str) -> dict[str, Any]:
    # Blocking: fetches Google's public keys over HTTP on every call.
    return id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        audience=client_id,
        clock_skew_in_seconds=10,
    )


async def verify_google_credential(credential: str) -> dict[str, Any]:
    """Check a Google ID token's signature, issuer, audience and expiry.

    Returns the token's claims. Raises InvalidGoogleCredential when the token
    is not one Google issued for GOOGLE_CLIENT_ID, and GoogleUnavailable when
    Google could not be reached to check it.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise InvalidGoogleCredential("GOOGLE_CLIENT_ID is not configured")
    try:
        return await asyncio.to_thread(
            _verify_with_google, credential, settings.GOOGLE_CLIENT_ID
        )
    except google_exceptions.TransportError as exc:
        raise GoogleUnavailable(str(exc)) from exc
    except (ValueError, google_exceptions.GoogleAuthError) as exc:
        raise InvalidGoogleCredential(str(exc)) from exc


def email_from_google_claims(
    claims: dict[str, Any], allowed_domains: list[str]
) -> str:
    """Return the lowercased email Google verified, if its domain is allowed.

    The domain is taken from the `hd` claim, which Google sets only for
    Workspace accounts, rather than from the email address itself. With no
    allowed domains configured, any verified Google account passes this step.
    Raises AccountNotAllowed otherwise.
    """
    email = claims.get("email")
    if not email or claims.get("email_verified") is not True:
        raise AccountNotAllowed("email missing or not verified by Google")

    if allowed_domains:
        hosted_domain = (claims.get("hd") or "").lower()
        if hosted_domain not in allowed_domains:
            raise AccountNotAllowed(f"domain {hosted_domain!r} is not allowed")

    return email.lower()


async def find_active_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Find the active user whose email matches, ignoring case."""
    result = await db.execute(
        select(User).where(func.lower(User.email) == email.lower())
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    return user


async def authenticate_google(db: AsyncSession, credential: str) -> User:
    """Sign a user in with a Google ID token.

    Google proves who the person is; access is decided here. The account must
    be in an allowed domain and match an active user an admin has already
    created. Nobody is created on first sign-in.
    Raises InvalidGoogleCredential, GoogleUnavailable or AccountNotAllowed.
    """
    claims = await verify_google_credential(credential)
    email = email_from_google_claims(claims, settings.google_allowed_domains)
    user = await find_active_user_by_email(db, email)
    if user is None:
        raise AccountNotAllowed("no active user with this email")
    return user
