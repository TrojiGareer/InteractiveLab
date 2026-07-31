from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.simulation import SimulationRun
from app.schemas.simulation import (
    SimulationCreate,
    SimulationResponse,
)


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
    simulation = SimulationRun(
        protocol=simulation_data.protocol.strip().lower(),
        input_parameters=simulation_data.input_parameters,
        result=None,
        status="pending",
    )

    db.add(simulation)
    db.commit()
    db.refresh(simulation)

    return simulation