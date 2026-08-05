from typing import Literal

from pydantic import BaseModel


class ProtocolParameterResponse(BaseModel):
    name: str
    label: str
    data_type: Literal["integer"]
    default: int
    minimum: int
    maximum: int
    unit: str | None = None
    description: str


class ProtocolResponse(BaseModel):
    id: str
    name: str
    description: str
    parameters: list[ProtocolParameterResponse]


class ProtocolListResponse(BaseModel):
    items: list[ProtocolResponse]