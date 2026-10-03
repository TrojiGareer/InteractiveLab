from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    status,
)
from sqlalchemy.orm import Session

from app.ai.provider import AIProviderError
from app.ai.service import AIService, get_ai_service
from app.db.session import get_db
from app.models.simulation import SimulationRun
from app.schemas.ai import (
    AIExplainResponse,
    AIPracticeRequest,
    AIPracticeResponse,
    AIReportRequest,
    AIReportResponse,
    AITroubleshootRequest,
    AITroubleshootResponse,
)


router = APIRouter(
    prefix="/api/v1/ai",
    tags=["AI"],
)


def get_simulation_or_404(
    db: Session,
    simulation_id: int,
) -> SimulationRun:
    simulation = db.get(
        SimulationRun,
        simulation_id,
    )

    if simulation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Simulation with id {simulation_id} "
                "was not found."
            ),
        )

    if simulation.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "AI analysis is available only for "
                "completed simulations."
            ),
        )

    if simulation.result is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=(
                "The simulation does not contain a result "
                "that can be analyzed."
            ),
        )

    return simulation


def run_ai_operation(
    operation,
):
    try:
        return operation()
    except AIProviderError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(error),
        ) from error


@router.post(
    "/explain/{simulation_id}",
    response_model=AIExplainResponse,
)
def explain_simulation(
    simulation_id: Annotated[
        int,
        Path(ge=1),
    ],
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[
        AIService,
        Depends(get_ai_service),
    ],
):
    simulation = get_simulation_or_404(
        db=db,
        simulation_id=simulation_id,
    )

    content = run_ai_operation(
        lambda: ai_service.explain(simulation)
    )

    return AIExplainResponse(
        simulation_id=simulation.id,
        content=content,
    )


@router.post(
    "/troubleshoot",
    response_model=AITroubleshootResponse,
)
def troubleshoot_simulation(
    request: AITroubleshootRequest,
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[
        AIService,
        Depends(get_ai_service),
    ],
):
    simulation = get_simulation_or_404(
        db=db,
        simulation_id=request.simulation_id,
    )

    content = run_ai_operation(
        lambda: ai_service.troubleshoot(
            simulation,
            request.problem_description,
        )
    )

    return AITroubleshootResponse(
        simulation_id=simulation.id,
        content=content,
        problem_description=request.problem_description,
    )


@router.post(
    "/practice",
    response_model=AIPracticeResponse,
)
def practice_simulation(
    request: AIPracticeRequest,
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[
        AIService,
        Depends(get_ai_service),
    ],
):
    simulation = get_simulation_or_404(
        db=db,
        simulation_id=request.simulation_id,
    )

    content = run_ai_operation(
        lambda: ai_service.practice(
            simulation,
            request.question_count,
        )
    )

    return AIPracticeResponse(
        simulation_id=simulation.id,
        content=content,
        question_count=request.question_count,
    )


@router.post(
    "/report",
    response_model=AIReportResponse,
)
def generate_report(
    request: AIReportRequest,
    db: Annotated[Session, Depends(get_db)],
    ai_service: Annotated[
        AIService,
        Depends(get_ai_service),
    ],
):
    simulation = get_simulation_or_404(
        db=db,
        simulation_id=request.simulation_id,
    )

    content = run_ai_operation(
        lambda: ai_service.report(
            simulation,
            request.analysis,
        )
    )

    return AIReportResponse(
        simulation_id=simulation.id,
        content=content,
    )