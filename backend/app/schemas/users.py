from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserListItem(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "user"
