from __future__ import annotations

import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator

HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class ProjectCreate(BaseModel):
    name: str
    color: str

    @field_validator("color")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        if not HEX_COLOR_RE.match(v):
            raise ValueError("color must be a valid hex color (#RRGGBB)")
        return v.upper()


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None

    @field_validator("color")
    @classmethod
    def validate_hex_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not HEX_COLOR_RE.match(v):
            raise ValueError("color must be a valid hex color (#RRGGBB)")
        return v.upper() if v is not None else v


class ProjectResponse(BaseModel):
    id: int
    name: str
    color: str
    is_deleted: bool
    created_at: datetime

    model_config = {"from_attributes": True}
