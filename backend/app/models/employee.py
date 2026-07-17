from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


employee_technologies = Table(
    "employee_technologies",
    Base.metadata,
    Column(
        "employee_id",
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "technology_id",
        Integer,
        ForeignKey("technologies.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Technology(Base):
    __tablename__ = "technologies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    team_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("teams.id"), nullable=True
    )
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    team: Mapped[Optional[Team]] = relationship("Team", lazy="selectin")
    technologies: Mapped[list[Technology]] = relationship(
        "Technology",
        secondary=employee_technologies,
        lazy="selectin",
        order_by="Technology.name",
    )
