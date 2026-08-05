from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


if TYPE_CHECKING:
    from app.models.scenario import Scenario


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
    )

    scenario_id: Mapped[int | None] = mapped_column(
        ForeignKey(
            "scenarios.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    protocol: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    input_parameters: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )

    result: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="completed",
        server_default="completed",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    scenario: Mapped[Scenario | None] = relationship(
        back_populates="simulation_runs",
    )