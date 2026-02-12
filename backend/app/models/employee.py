from __future__ import annotations

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Team(str, enum.Enum):
    PM = "PM"
    QA = "QA"
    Frontend = "Frontend"
    Backend = "Backend"
    Mobile = "Mobile"
    UX_UI_Designer = "UX_UI_Designer"
    DevOps = "DevOps"


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    team: Mapped[Optional[Team]] = mapped_column(Enum(Team), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
