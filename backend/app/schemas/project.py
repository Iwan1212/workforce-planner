from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    color: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    color: str
    is_deleted: bool
    created_at: datetime

    model_config = {"from_attributes": True}
