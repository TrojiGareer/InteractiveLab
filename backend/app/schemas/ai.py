from typing import Literal

from pydantic import BaseModel, Field


class AIBaseResponse(BaseModel):
    simulation_id: int
    content: str


class AIExplainResponse(AIBaseResponse):
    pass


class AITroubleshootRequest(BaseModel):
    simulation_id: int = Field(ge=1)
    problem_description: str = Field(min_length=1, max_length=5000)


class AITroubleshootResponse(AIBaseResponse):
    problem_description: str


# Legacy batch endpoint is retained for compatibility with the current UI/tests.
class AIPracticeRequest(BaseModel):
    simulation_id: int = Field(ge=1)
    question_count: int = Field(default=3, ge=1, le=10)


class AIPracticeResponse(AIBaseResponse):
    question_count: int


class AIPracticeQuestionRequest(BaseModel):
    simulation_id: int = Field(ge=1)
    level: Literal["beginner", "intermediate", "advanced"] = "beginner"


class AIPracticeQuestionResponse(BaseModel):
    simulation_id: int
    question_id: str
    level: Literal["beginner", "intermediate", "advanced"]
    question: str


class AIPracticeEvaluateRequest(BaseModel):
    simulation_id: int = Field(ge=1)
    question_id: str = Field(min_length=1, max_length=100)
    answer: str = Field(min_length=1, max_length=2000)


class AIPracticeEvaluateResponse(BaseModel):
    simulation_id: int
    question_id: str
    is_correct: bool
    submitted_answer: str
    correct_answer: str
    feedback: str
    explanation: str


class AIReportRequest(BaseModel):
    simulation_id: int = Field(ge=1)
    analysis: str | None = Field(default=None, max_length=10000)


class AIReportResponse(AIBaseResponse):
    report_format: str = "markdown"
