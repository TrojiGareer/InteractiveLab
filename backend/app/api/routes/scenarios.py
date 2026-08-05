from copy import deepcopy
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    Response,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.scenario import Scenario
from app.models.simulation import SimulationRun
from app.schemas.scenario import (
    ScenarioCreate,
    ScenarioListResponse,
    ScenarioPatch,
    ScenarioReplace,
    ScenarioResponse,
)
from app.schemas.simulation import SimulationResponse
from app.services.simulation_runner import (
    UnsupportedProtocolError,
    execute_simulation,
)


router = APIRouter(
    prefix="/api/v1/scenarios",
    tags=["Scenarios"],
)


def get_scenario_or_404(
    db: Session,
    scenario_id: int,
) -> Scenario:
    scenario = db.get(Scenario, scenario_id)

    if scenario is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Scenario with id {scenario_id} "
                "was not found."
            ),
        )

    return scenario


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
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error


def validate_scenario_configuration(
    protocol: str,
    parameters: dict[str, Any],
) -> None:
    execute_or_raise_http_error(
        protocol=protocol,
        parameters=parameters,
    )


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
    response_model=ScenarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_scenario(
    scenario_data: ScenarioCreate,
    db: Annotated[Session, Depends(get_db)],
):
    validate_scenario_configuration(
        protocol=scenario_data.protocol,
        parameters=scenario_data.parameters,
    )

    scenario = Scenario(
        name=scenario_data.name,
        description=scenario_data.description,
        protocol=scenario_data.protocol,
        parameters=deepcopy(scenario_data.parameters),
    )

    db.add(scenario)
    commit_changes(db)
    db.refresh(scenario)

    return scenario


@router.get(
    "",
    response_model=ScenarioListResponse,
)
def list_scenarios(
    db: Annotated[Session, Depends(get_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    total = db.scalar(
        select(func.count(Scenario.id))
    ) or 0

    statement = (
        select(Scenario)
        .order_by(
            Scenario.updated_at.desc(),
            Scenario.id.desc(),
        )
        .offset(skip)
        .limit(limit)
    )

    scenarios = list(
        db.scalars(statement).all()
    )

    return ScenarioListResponse(
        items=scenarios,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{scenario_id}",
    response_model=ScenarioResponse,
)
def get_scenario(
    scenario_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(get_db)],
):
    return get_scenario_or_404(
        db=db,
        scenario_id=scenario_id,
    )


@router.put(
    "/{scenario_id}",
    response_model=ScenarioResponse,
)
def replace_scenario(
    scenario_id: Annotated[int, Path(ge=1)],
    scenario_data: ScenarioReplace,
    db: Annotated[Session, Depends(get_db)],
):
    scenario = get_scenario_or_404(
        db=db,
        scenario_id=scenario_id,
    )

    validate_scenario_configuration(
        protocol=scenario_data.protocol,
        parameters=scenario_data.parameters,
    )

    scenario.name = scenario_data.name
    scenario.description = scenario_data.description
    scenario.protocol = scenario_data.protocol
    scenario.parameters = deepcopy(
        scenario_data.parameters
    )

    commit_changes(db)
    db.refresh(scenario)

    return scenario


@router.patch(
    "/{scenario_id}",
    response_model=ScenarioResponse,
)
def patch_scenario(
    scenario_id: Annotated[int, Path(ge=1)],
    scenario_data: ScenarioPatch,
    db: Annotated[Session, Depends(get_db)],
):
    scenario = get_scenario_or_404(
        db=db,
        scenario_id=scenario_id,
    )

    changes = scenario_data.model_dump(
        exclude_unset=True
    )

    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields were provided for update.",
        )

    required_fields = {
        "name",
        "protocol",
        "parameters",
    }

    for field in required_fields:
        if field in changes and changes[field] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"'{field}' cannot be null.",
            )

    merged_protocol = changes.get(
        "protocol",
        scenario.protocol,
    )

    merged_parameters = changes.get(
        "parameters",
        scenario.parameters,
    )

    validate_scenario_configuration(
        protocol=merged_protocol,
        parameters=merged_parameters,
    )

    for field, value in changes.items():
        if field == "parameters":
            value = deepcopy(value)

        setattr(scenario, field, value)

    commit_changes(db)
    db.refresh(scenario)

    return scenario


@router.post(
    "/{scenario_id}/run",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED,
)
def run_scenario(
    scenario_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(get_db)],
):
    scenario = get_scenario_or_404(
        db=db,
        scenario_id=scenario_id,
    )

    protocol, result = execute_or_raise_http_error(
        protocol=scenario.protocol,
        parameters=scenario.parameters,
    )

    simulation = SimulationRun(
        scenario_id=scenario.id,
        protocol=protocol,
        input_parameters=deepcopy(
            scenario.parameters
        ),
        result=result,
        status="completed",
    )

    db.add(simulation)
    commit_changes(db)
    db.refresh(simulation)

    return simulation


@router.delete(
    "/{scenario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_scenario(
    scenario_id: Annotated[int, Path(ge=1)],
    db: Annotated[Session, Depends(get_db)],
):
    scenario = get_scenario_or_404(
        db=db,
        scenario_id=scenario_id,
    )

    db.delete(scenario)
    commit_changes(db)

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )