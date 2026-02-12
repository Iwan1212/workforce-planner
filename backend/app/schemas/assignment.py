from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class AssignmentCreate(BaseModel):
    employee_id: int
    project_id: int
    start_date: date
    end_date: date
    allocation_type: str  # "percentage" | "monthly_hours"
    allocation_value: float
    note: Optional[str] = None

    @field_validator("allocation_type")
    @classmethod
    def validate_allocation_type(cls, v: str) -> str:
        if v not in ("percentage", "monthly_hours"):
            raise ValueError("allocation_type must be 'percentage' or 'monthly_hours'")
        return v

    @field_validator("allocation_value")
    @classmethod
    def validate_allocation_value(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("allocation_value must be > 0")
        return v


class AssignmentUpdate(BaseModel):
    employee_id: Optional[int] = None
    project_id: Optional[int] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    allocation_type: Optional[str] = None
    allocation_value: Optional[float] = None
    note: Optional[str] = None


class AssignmentResponse(BaseModel):
    id: int
    employee_id: int
    project_id: int
    project_name: str
    project_color: str
    start_date: date
    end_date: date
    allocation_type: str
    allocation_value: float
    daily_hours: float
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
