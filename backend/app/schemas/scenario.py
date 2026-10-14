from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
)


ScenarioName = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=100,
    ),
]


class ScenarioCreate(BaseModel):
    name: ScenarioName

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    protocol: Literal["tcp"]

    parameters: dict[str, Any] = Field(
        default_factory=dict,
    )


class ScenarioReplace(BaseModel):
    name: ScenarioName

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    protocol: Literal["tcp"]

    parameters: dict[str, Any]


class ScenarioPatch(BaseModel):
    name: ScenarioName | None = None

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    protocol: Literal["tcp"] | None = None

    parameters: dict[str, Any] | None = None


class ScenarioResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    protocol: str
    parameters: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class ScenarioListResponse(BaseModel):
    items: list[ScenarioResponse]
    total: int
    skip: int
    limit: int 