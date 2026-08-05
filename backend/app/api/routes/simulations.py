from copy import deepcopy
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.simulation import SimulationRun
from app.schemas.simulation import (
    SimulationCreate,
    SimulationListResponse,
    SimulationResponse,
)
from app.services.simulation_runner import (
    UnsupportedProtocolError,
    execute_simulation,
)


router = APIRouter(
    prefix="/api/v1/simulations",
    tags=["Simulations"],
)


def execute_or_raise_http_error(
    protocol: str,
    parameters: dict[str, Any],
) -> tuple[str, dict[str, Any]]:
    try:
        return execute_simulation(
            protocol=protocol,
            parameters=parameters,
        )
    except UnsupportedProtocolError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error


def commit_changes(db: Session) -> None:
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database operation failed.",
        ) from error


@router.post(
    "",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_simulation(
    simulation_data: SimulationCreate,
    db: Annotated[Session, Depends(get_db)],
):
    protocol, result = execute_or_raise_http_error(
        protocol=simulation_data.protocol,
        parameters=simulation_data.input_parameters,
    )

    simulation = SimulationRun(
        scenario_id=None,
        protocol=protocol,
        input_parameters=deepcopy(
            simulation_data.input_parameters
        ),
        result=result,
        status="completed",
    )

    db.add(simulation)
    commit_changes(db)
    db.refresh(simulation)

    return simulation


@router.get(
    "",
    response_model=SimulationListResponse,
)
def list_simulations(
    db: Annotated[Session, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    total = db.scalar(
        select(func.count(SimulationRun.id))
    ) or 0

    statement = (
        select(SimulationRun)
        .order_by(
            SimulationRun.created_at.desc(),
            SimulationRun.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    )

    simulations = list(
        db.scalars(statement).all()
    )

    return SimulationListResponse(
        items=simulations,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{simulation_id}",
    response_model=SimulationResponse,
)
def get_simulation(
    simulation_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(get_db)],
):
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

    return simulation
