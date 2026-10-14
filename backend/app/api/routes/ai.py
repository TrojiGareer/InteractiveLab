import logging
from typing import Annotated, Callable, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.ai.provider import AIProviderError
from app.ai.service import AIService, get_ai_service
from app.db.session import get_db
from app.models.simulation import SimulationRun
from app.schemas.ai import (
    AIExplainResponse,
    AIPracticeEvaluateRequest,
    AIPracticeEvaluateResponse,
    AIPracticeQuestionRequest,
    AIPracticeQuestionResponse,
    AIPracticeRequest,
    AIPracticeResponse,
    AIReportRequest,
    AIReportResponse,
    AITroubleshootRequest,
    AITroubleshootResponse,
)


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/ai", tags=["AI"])
T = TypeVar("T")


def get_simulation_or_404(db: Session, simulation_id: int) -> SimulationRun:
    simulation = db.get(SimulationRun, simulation_id)
    if simulation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation with id {simulation_id} was not found.",
        )
    if simulation.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="AI analysis is available only for completed simulations.",
        )
    if simulation.result is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="The simulation does not contain a result that can be analyzed.",
        )
    return simulation


def run_ai_operation(operation: Callable[[], T]) -> T:
    try:
        return operation()
    except AIProviderError as error:
        logger.warning("AI provider operation failed: %s", error)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The AI service is temporarily unavailable.",
        ) from error


@router.post("/explain/{simulation_id}", response_model=AIExplainResponse)
def explain_simulation(
    simulation_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[AIService, Depends(get_ai_service)],
):
    simulation = get_simulation_or_404(db, simulation_id)
    content = run_ai_operation(lambda: ai_service.explain(simulation))
    return AIExplainResponse(simulation_id=simulation.id, content=content)


@router.post("/troubleshoot", response_model=AITroubleshootResponse)
def troubleshoot_simulation(
    request: AITroubleshootRequest,
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[AIService, Depends(get_ai_service)],
):
    simulation = get_simulation_or_404(db, request.simulation_id)
    content = run_ai_operation(
        lambda: ai_service.troubleshoot(simulation, request.problem_description)
    )
    return AITroubleshootResponse(
        simulation_id=simulation.id,
        content=content,
        problem_description=request.problem_description,
    )


@router.post("/practice", response_model=AIPracticeResponse)
def practice_simulation(
    request: AIPracticeRequest,
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[AIService, Depends(get_ai_service)],
):
    """Legacy batch endpoint retained for current clients."""
    simulation = get_simulation_or_404(db, request.simulation_id)
    content = run_ai_operation(
        lambda: ai_service.practice(simulation, request.question_count)
    )
    return AIPracticeResponse(
        simulation_id=simulation.id,
        content=content,
        question_count=request.question_count,
    )


@router.post("/practice/question", response_model=AIPracticeQuestionResponse)
def generate_practice_question(
    request: AIPracticeQuestionRequest,
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[AIService, Depends(get_ai_service)],
):
    simulation = get_simulation_or_404(db, request.simulation_id)
    result = run_ai_operation(
        lambda: ai_service.practice_question(simulation, request.level)
    )
    return AIPracticeQuestionResponse(**result)


@router.post("/practice/evaluate", response_model=AIPracticeEvaluateResponse)
def evaluate_practice_answer(
    request: AIPracticeEvaluateRequest,
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[AIService, Depends(get_ai_service)],
):
    simulation = get_simulation_or_404(db, request.simulation_id)
    try:
        result = ai_service.evaluate_practice(
            simulation=simulation,
            question_id=request.question_id,
            answer=request.answer,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    return AIPracticeEvaluateResponse(**result)


@router.post("/report", response_model=AIReportResponse)
def generate_report(
    request: AIReportRequest,
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[AIService, Depends(get_ai_service)],
):
    simulation = get_simulation_or_404(db, request.simulation_id)
    content = run_ai_operation(
        lambda: ai_service.report(simulation, request.analysis)
    )
    return AIReportResponse(simulation_id=simulation.id, content=content)
