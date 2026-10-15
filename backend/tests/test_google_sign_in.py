"""Google sign-in: who may come in.

Google itself is replaced by a stub that returns chosen claims, because a real
ID token only exists after a person signs in through a browser. Everything
after Google's answer runs for real: the domain check, the email match against
an actual users table (SQLite in a temp file), the JWTs, and the routes.
"""

from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient
from google.auth import exceptions as google_exceptions
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.core.dependencies import get_db
from app.core.security import create_access_token
from app.main import app
from app.models.user import User, UserRole
from app.services import auth_service
from app.services.auth_service import AccountNotAllowed, email_from_google_claims

CLIENT_ID = "test-client.apps.googleusercontent.com"


def claims(email: str, hd: str | None = "example.com", verified: bool = True) -> dict:
    result = {"email": email, "email_verified": verified, "sub": "123"}
    if hd is not None:
        result["hd"] = hd
    return result


@pytest.fixture
def google(monkeypatch):
    """Stub Google: maps a credential string to the claims it 'verifies' to."""
    answers: dict[str, dict | Exception] = {}

    def fake_verify(credential: str, client_id: str) -> dict:
        assert client_id == CLIENT_ID, "token must be checked against our client ID"
        answer = answers.get(credential, ValueError("Wrong number of segments"))
        if isinstance(answer, Exception):
            raise answer
        return answer

    monkeypatch.setattr(auth_service, "_verify_with_google", fake_verify)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", CLIENT_ID)
    monkeypatch.setattr(settings, "GOOGLE_ALLOWED_DOMAINS", "example.com")
    return answers


@pytest.fixture
def users(tmp_path):
    """A real users table; returns a function that inserts a user."""
    url = f"sqlite+aiosqlite:///{tmp_path / 'auth.db'}"
    # NullPool: the test client runs the app on its own event loop, so no
    # connection may outlive the loop that opened it.
    engine = create_async_engine(url, poolclass=NullPool)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async def create_table():
        async with engine.begin() as conn:
            await conn.run_sync(User.__table__.create)

    asyncio.run(create_table())

    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    def add(email: str, role: UserRole = UserRole.user, is_active: bool = True) -> int:
        async def insert():
            async with session_factory() as session:
                user = User(
                    email=email, full_name=email, role=role, is_active=is_active
                )
                session.add(user)
                await session.commit()
                return user.id

        return asyncio.run(insert())

    yield add
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def client():
    # Not used as a context manager, so the lifespan (vacation sync) never starts.
    return TestClient(app)


def sign_in(client: TestClient, credential: str):
    return client.post("/api/auth/google", json={"credential": credential})


class TestDomainAndEmailRules:
    """The pure check on Google's claims, before any user lookup."""

    def test_allowed_domain_passes_and_email_is_lowercased(self):
        assert (
            email_from_google_claims(claims("Anna@Example.com"), ["example.com"])
            == "anna@example.com"
        )

    def test_other_workspace_domain_is_refused(self):
        with pytest.raises(AccountNotAllowed):
            email_from_google_claims(claims("anna@other.com", hd="other.com"), ["example.com"])

    def test_consumer_account_has_no_hd_and_is_refused(self):
        with pytest.raises(AccountNotAllowed):
            email_from_google_claims(claims("anna@gmail.com", hd=None), ["example.com"])

    def test_email_domain_alone_does_not_count(self):
        # The address looks right, but Google did not vouch for the domain.
        with pytest.raises(AccountNotAllowed):
            email_from_google_claims(claims("anna@example.com", hd=None), ["example.com"])

    def test_unverified_email_is_refused(self):
        with pytest.raises(AccountNotAllowed):
            email_from_google_claims(claims("anna@example.com", verified=False), ["example.com"])

    def test_no_domains_configured_allows_any_verified_account(self):
        assert email_from_google_claims(claims("anna@gmail.com", hd=None), []) == "anna@gmail.com"

    def test_configured_domains_are_trimmed_and_lowercased(self, monkeypatch):
        monkeypatch.setattr(settings, "GOOGLE_ALLOWED_DOMAINS", " Example.com, other.org ,")
        assert settings.google_allowed_domains == ["example.com", "other.org"]


class TestGoogleSignIn:
    def test_known_active_user_gets_tokens_that_work(self, client, google, users):
        users("anna@example.com")
        google["good"] = claims("anna@example.com")

        response = sign_in(client, "good")

        assert response.status_code == 200
        token = response.json()["access_token"]
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["email"] == "anna@example.com"

    def test_email_matches_ignoring_case_both_ways(self, client, google, users):
        users("Legacy.User@example.com")  # stored before emails were lowercased
        google["good"] = claims("legacy.user@EXAMPLE.com")

        assert sign_in(client, "good").status_code == 200

    def test_domain_account_without_a_user_is_refused(self, client, google, users):
        users("anna@example.com")
        google["stranger"] = claims("jan@example.com")

        response = sign_in(client, "stranger")

        assert response.status_code == 403
        assert "nie ma dostępu" in response.json()["detail"]

    def test_inactive_user_is_refused(self, client, google, users):
        users("anna@example.com", is_active=False)
        google["good"] = claims("anna@example.com")

        assert sign_in(client, "good").status_code == 403

    def test_user_outside_allowed_domain_is_refused_even_if_added(self, client, google, users):
        users("anna@gmail.com")
        google["gmail"] = claims("anna@gmail.com", hd=None)

        assert sign_in(client, "gmail").status_code == 403

    def test_without_domain_restriction_a_matching_user_gets_in(
        self, client, google, users, monkeypatch
    ):
        monkeypatch.setattr(settings, "GOOGLE_ALLOWED_DOMAINS", "")
        users("anna@gmail.com")
        google["gmail"] = claims("anna@gmail.com", hd=None)

        assert sign_in(client, "gmail").status_code == 200

    def test_token_google_rejects_is_401(self, client, google, users):
        # Forged, expired, or issued for another app: Google's library raises
        # ValueError for all of them.
        google["forged"] = ValueError("Token expired")

        response = sign_in(client, "forged")

        assert response.status_code == 401
        assert "nie powiodło się" in response.json()["detail"]

    def test_google_unreachable_is_503(self, client, google, users):
        google["offline"] = google_exceptions.TransportError("connection refused")

        assert sign_in(client, "offline").status_code == 503

    def test_sign_in_refused_when_client_id_not_configured(self, client, google, users):
        settings.GOOGLE_CLIENT_ID = ""  # restored by monkeypatch in the google fixture
        users("anna@example.com")
        google["good"] = claims("anna@example.com")

        assert sign_in(client, "good").status_code == 401


class TestAuthConfig:
    def test_reports_client_id(self, client, google):
        assert client.get("/api/auth/config").json() == {"google_client_id": CLIENT_ID}

    def test_reports_null_when_not_configured(self, client, monkeypatch):
        monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
        assert client.get("/api/auth/config").json() == {"google_client_id": None}


class TestPasswordsAreGone:
    def test_missing_bearer_header_is_401_not_403(self, client):
        # The frontend refreshes and logs out only on 401.
        assert client.get("/api/auth/me").status_code == 401

    @pytest.mark.parametrize(
        "path", ["/api/auth/login", "/api/auth/reset-password-request", "/api/auth/reset-password"]
    )
    def test_password_endpoints_no_longer_exist(self, client, path):
        assert client.post(path, json={}).status_code == 404


class TestUserManagement:
    def admin_headers(self, users) -> dict:
        admin_id = users("admin@example.com", role=UserRole.admin)
        return {"Authorization": f"Bearer {create_access_token({'sub': str(admin_id)})}"}

    def test_user_is_created_without_password_and_lowercased(self, client, users):
        headers = self.admin_headers(users)

        response = client.post(
            "/api/users",
            json={"email": "Jan.Kowalski@Example.com", "full_name": "Jan Kowalski"},
            headers=headers,
        )

        assert response.status_code == 201
        assert response.json()["email"] == "jan.kowalski@example.com"

    def test_email_differing_only_in_case_is_a_conflict(self, client, users):
        headers = self.admin_headers(users)
        users("anna@example.com")

        response = client.post(
            "/api/users",
            json={"email": "ANNA@example.com", "full_name": "Anna"},
            headers=headers,
        )

        assert response.status_code == 409
