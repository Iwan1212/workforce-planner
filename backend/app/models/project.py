from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    # Internal work: recruitment, our own product, sales and PM time. Time
    # planned here never reaches a client, which is the whole reason to mark it.
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
