from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class SimulationCreate(BaseModel):
    protocol: str = Field(
        min_length=1,
        max_length=50,
        examples=["tcp"],
    )

    input_parameters: dict[str, Any] = Field(
        default_factory=dict,
    )


class SimulationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    protocol: str
    input_parameters: dict[str, Any]
    result: dict[str, Any] | None
    status: str
    created_at: datetime