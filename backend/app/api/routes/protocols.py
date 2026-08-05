from typing import Annotated

from fastapi import (
    APIRouter,
    HTTPException,
    Path,
    status,
)

from app.schemas.protocol import (
    ProtocolListResponse,
    ProtocolParameterResponse,
    ProtocolResponse,
)


router = APIRouter(
    prefix="/api/v1/protocols",
    tags=["Protocols"],
)


TCP_PROTOCOL = ProtocolResponse(
    id="tcp",
    name="TCP Three-Way Handshake",
    description=(
        "Simulates the three messages used to "
        "establish a TCP connection: SYN, "
        "SYN-ACK and ACK."
    ),
    parameters=[
        ProtocolParameterResponse(
            name="latency_ms",
            label="Network latency",
            data_type="integer",
            default=100,
            minimum=0,
            maximum=5000,
            unit="ms",
            description=(
                "One-way simulated network latency."
            ),
        ),
        ProtocolParameterResponse(
            name="client_initial_sequence",
            label="Client initial sequence",
            data_type="integer",
            default=1000,
            minimum=0,
            maximum=4294967295,
            description=(
                "Initial TCP sequence number "
                "selected by the client."
            ),
        ),
        ProtocolParameterResponse(
            name="server_initial_sequence",
            label="Server initial sequence",
            data_type="integer",
            default=5000,
            minimum=0,
            maximum=4294967295,
            description=(
                "Initial TCP sequence number "
                "selected by the server."
            ),
        ),
    ],
)


PROTOCOL_CATALOG: dict[str, ProtocolResponse] = {
    TCP_PROTOCOL.id: TCP_PROTOCOL,
}


@router.get(
    "",
    response_model=ProtocolListResponse,
)
def list_protocols():
    return ProtocolListResponse(
        items=list(PROTOCOL_CATALOG.values())
    )


@router.get(
    "/{protocol_id}",
    response_model=ProtocolResponse,
)
def get_protocol(
    protocol_id: Annotated[
        str,
        Path(min_length=1, max_length=50),
    ],
):
    normalized_protocol_id = (
        protocol_id.strip().lower()
    )

    protocol = PROTOCOL_CATALOG.get(
        normalized_protocol_id
    )

    if protocol is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Protocol '{normalized_protocol_id}' "
                "was not found."
            ),
        )

    return protocol