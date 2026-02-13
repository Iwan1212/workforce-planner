"""Simple in-memory rate limiter for login endpoint.

For production with multiple workers, replace with Redis-backed solution (e.g. slowapi).
"""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, Request, status

# Max login attempts per IP within the time window
MAX_ATTEMPTS = 10
WINDOW_SECONDS = 60


class _RateLimiter:
    def __init__(self) -> None:
        self._attempts: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            attempts = self._attempts[key]
            # Remove expired entries
            self._attempts[key] = [t for t in attempts if now - t < WINDOW_SECONDS]
            if len(self._attempts[key]) >= MAX_ATTEMPTS:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Zbyt wiele prób logowania. Spróbuj ponownie za minutę.",
                )
            self._attempts[key].append(now)


_login_limiter = _RateLimiter()


async def login_rate_limit(request: Request) -> None:
    """FastAPI dependency that rate-limits login by client IP."""
    client_ip = request.client.host if request.client else "unknown"
    _login_limiter.check(client_ip)
