from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    team: Optional[str] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be blank")
        return v.strip()


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    team: Optional[str] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def name_must_not_be_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("must not be blank")
        return v.strip() if v is not None else v


class EmployeeResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    team: Optional[str] = None
    is_deleted: bool
    created_at: datetime

    model_config = {"from_attributes": True}
