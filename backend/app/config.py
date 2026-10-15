from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = (
        "postgresql+asyncpg://workforce:workforce_dev@localhost:5433/workforce_planner"
    )
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    CORS_ORIGINS: str = "http://localhost:5173"
    ENVIRONMENT: str = "development"
    # OAuth client from Google Cloud. Empty means Google sign-in is not configured.
    GOOGLE_CLIENT_ID: str = ""
    # Comma-separated Google Workspace domains allowed to sign in. Empty means any
    # Google account, which still has to match an existing user by email.
    GOOGLE_ALLOWED_DOMAINS: str = ""
    # Created as an admin on startup if no user has this email yet.
    INITIAL_ADMIN_EMAIL: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def google_allowed_domains(self) -> list[str]:
        """Allowed Workspace domains, lowercased, blanks dropped."""
        return [
            d.strip().lower()
            for d in self.GOOGLE_ALLOWED_DOMAINS.split(",")
            if d.strip()
        ]

    @property
    def async_database_url(self) -> str:
        """Convert Render's postgresql:// to postgresql+asyncpg://."""
        url = self.DATABASE_URL
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url


settings = Settings()

_DEFAULT_SECRET_KEY = "dev-secret-key-change-in-production"
if settings.SECRET_KEY == _DEFAULT_SECRET_KEY and settings.ENVIRONMENT != "development":
    raise RuntimeError(
        "FATAL: Default SECRET_KEY detected in non-development environment. "
        "Set SECRET_KEY to a secure random value via environment variable."
    )

if not settings.GOOGLE_CLIENT_ID and settings.ENVIRONMENT != "development":
    raise RuntimeError(
        "FATAL: GOOGLE_CLIENT_ID is not set in a non-development environment. "
        "Nobody can sign in without it."
    )
