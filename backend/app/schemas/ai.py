from pydantic import BaseModel, Field


class AIBaseResponse(BaseModel):
    simulation_id: int
    content: str


class AIExplainResponse(AIBaseResponse):
    pass


class AITroubleshootRequest(BaseModel):
    simulation_id: int = Field(ge=1)
    problem_description: str = Field(
        min_length=1,
        max_length=5000,
    )


class AITroubleshootResponse(AIBaseResponse):
    problem_description: str


class AIPracticeRequest(BaseModel):
    simulation_id: int = Field(ge=1)
    question_count: int = Field(
        default=3,
        ge=1,
        le=10,
    )


class AIPracticeResponse(AIBaseResponse):
    question_count: int


class AIReportRequest(BaseModel):
    simulation_id: int = Field(ge=1)
    analysis: str | None = Field(
        default=None,
        max_length=10000,
    )


class AIReportResponse(AIBaseResponse):
    report_format: str = "markdown"