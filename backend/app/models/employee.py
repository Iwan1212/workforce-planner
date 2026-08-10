from __future__ import annotations

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Sequence

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Table,
    UniqueConstraint,
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
        index=True,
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
        Integer, ForeignKey("teams.id"), nullable=True, index=True
    )
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)
    is_archived: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
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
    capacities: Mapped[list["EmployeeCapacity"]] = relationship(
        "EmployeeCapacity",
        lazy="selectin",
        cascade="all, delete-orphan",
        order_by="EmployeeCapacity.valid_from",
        back_populates="employee",
    )

    @property
    def current_capacity(self) -> Optional["EmployeeCapacity"]:
        """The capacity entry in force today, or None if not employed today."""
        return resolve_capacity_at(self.capacities, date.today())


class CapacityType(str, enum.Enum):
    """How an employee's contracted capacity is expressed.

    Mirrors AllocationType (minus `total_hours`, which is meaningless for an
    open-ended contract), so both share `calculate_daily_hours`.
    """

    percentage = "percentage"
    monthly_hours = "monthly_hours"


class EmployeeCapacity(Base):
    """One effective-dated slice of an employee's contracted capacity.

    Slices carry a start date only: an entry stays in force until the next one
    begins, so the timeline is always gap-free and no two entries can overlap.
    A day *before* the earliest entry is deliberately left uncovered and counts
    as zero availability, which is how "not employed yet" is expressed.
    """

    __tablename__ = "employee_capacities"
    __table_args__ = (
        UniqueConstraint("employee_id", "valid_from", name="uq_capacity_employee_from"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    capacity_type: Mapped[CapacityType] = mapped_column(
        Enum(CapacityType, name="capacitytype"), nullable=False
    )
    capacity_value: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    employee: Mapped[Employee] = relationship("Employee", back_populates="capacities")

    @property
    def is_full_time(self) -> bool:
        """Whether this entry is an ordinary full-time contract.

        Drives whether the UI marks the employee at all: the badge earns its
        place precisely because part time is the exception.
        """
        return (
            self.capacity_type == CapacityType.percentage
            and Decimal(str(self.capacity_value)) == Decimal("100")
        )


def resolve_capacity_at(
    capacities: Sequence[EmployeeCapacity], day: date
) -> Optional[EmployeeCapacity]:
    """Return the capacity entry in force on `day`, or None if none covers it.

    The entry in force is the latest one starting on or before `day`. None means
    the day precedes the employee's first entry, i.e. zero availability.
    """
    in_force = None
    for capacity in sorted(capacities, key=lambda c: c.valid_from):
        if capacity.valid_from > day:
            break
        in_force = capacity
    return in_force
