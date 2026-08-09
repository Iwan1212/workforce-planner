from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from app.schemas.team import TeamResponse
from app.schemas.technology import TechnologyResponse

CapacityTypeLiteral = Literal["percentage", "monthly_hours"]


class CapacityBase(BaseModel):
    valid_from: date
    capacity_type: CapacityTypeLiteral
    capacity_value: float

    @field_validator("capacity_type", mode="before")
    @classmethod
    def enum_to_value(cls, v: object) -> object:
        """Accept the SQLAlchemy enum as well as its wire value."""
        return v.value if hasattr(v, "value") else v

    @field_validator("capacity_value")
    @classmethod
    def value_must_be_positive(cls, v: float) -> float:
        """Zero capacity is expressed by the absence of an entry, not by 0.

        Leaving a stretch of time uncovered is what marks somebody as not
        employed yet; an entry worth nothing would be a second way to say the
        same thing, and one that silently swallows any work booked against it.
        """
        if v <= 0:
            raise ValueError("must be greater than 0")
        return round(v, 2)


class CapacityCreate(CapacityBase):
    pass


class CapacityUpdate(CapacityBase):
    pass


class CapacityResponse(CapacityBase):
    id: int
    is_full_time: bool

    model_config = {"from_attributes": True}


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    team_id: Optional[int] = None
    technology_ids: list[int] = []
    email: Optional[str] = None

    @field_validator("first_name", "last_name")
    @classmethod
    def name_must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be blank")
        return v.strip()


class EmployeeUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    team_id: Optional[int] = None
    technology_ids: Optional[list[int]] = None
    email: Optional[str] = None

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
    team: Optional[TeamResponse] = None
    technologies: list[TechnologyResponse] = []
    email: Optional[str] = None
    is_archived: bool
    created_at: datetime
    capacities: list[CapacityResponse] = []
    # None means no contract covers today, i.e. the employee has not started yet
    # (or their entries end before today).
    current_capacity: Optional[CapacityResponse] = None

    model_config = {"from_attributes": True}
