from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.simulation import SimulationRun
from app.schemas.simulation import (
    SimulationCreate,
    SimulationResponse,
)
from app.services.simulators.tcp import simulate_tcp_handshake


router = APIRouter(
    prefix="/api/v1/simulations",
    tags=["Simulations"],
)


@router.post(
    "",
    response_model=SimulationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_simulation(
    simulation_data: SimulationCreate,
    db: Session = Depends(get_db),
):
    protocol = simulation_data.protocol.strip().lower()

    if protocol != "tcp":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Protocol '{protocol}' is not supported yet.",
        )

    try:
        result = simulate_tcp_handshake(
            simulation_data.input_parameters
        )
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail=str(error),
        ) from error

    simulation = SimulationRun(
        protocol=protocol,
        input_parameters=simulation_data.input_parameters,
        result=result,
        status="completed",
    )

    db.add(simulation)
    db.commit()
    db.refresh(simulation)

    return simulation