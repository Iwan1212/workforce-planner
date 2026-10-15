from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class GoogleLoginRequest(BaseModel):
    credential: str


class AuthConfigResponse(BaseModel):
    google_client_id: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    theme: str = "light"

    model_config = {"from_attributes": True}


class ThemeUpdate(BaseModel):
    theme: str
