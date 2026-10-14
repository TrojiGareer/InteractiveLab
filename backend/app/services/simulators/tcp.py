from dataclasses import dataclass
from typing import Any


TCP_SEQUENCE_MODULUS = 2**32
MAX_TCP_SEQUENCE_NUMBER = TCP_SEQUENCE_MODULUS - 1


@dataclass(frozen=True)
class TcpParameterSpec:
    default: int
    minimum: int
    maximum: int


TCP_PARAMETER_SPECS: dict[str, TcpParameterSpec] = {
    "latency_ms": TcpParameterSpec(
        default=100,
        minimum=0,
        maximum=5000,
    ),
    "client_initial_sequence": TcpParameterSpec(
        default=1000,
        minimum=0,
        maximum=MAX_TCP_SEQUENCE_NUMBER,
    ),
    "server_initial_sequence": TcpParameterSpec(
        default=5000,
        minimum=0,
        maximum=MAX_TCP_SEQUENCE_NUMBER,
    ),
}

SUPPORTED_TCP_PARAMETERS = frozenset(TCP_PARAMETER_SPECS)


def _validate_parameter_names(
    parameters: dict[str, Any],
) -> None:
    unsupported_parameters = sorted(
        (
            str(parameter)
            for parameter in parameters
            if parameter not in SUPPORTED_TCP_PARAMETERS
        )
    )

    if unsupported_parameters:
        formatted_parameters = ", ".join(
            f"'{parameter}'"
            for parameter in unsupported_parameters
        )

        raise ValueError(
            "Unsupported TCP parameter(s): "
            f"{formatted_parameters}."
        )


def _get_integer_parameter(
    parameters: dict[str, Any],
    name: str,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    value = parameters.get(name, default)

    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(
            f"'{name}' must be an integer."
        )

    if value < minimum or value > maximum:
        raise ValueError(
            f"'{name}' must be between "
            f"{minimum} and {maximum}."
        )

    return value


def _next_sequence_number(
    sequence_number: int,
) -> int:
    return (
        sequence_number + 1
    ) % TCP_SEQUENCE_MODULUS


def simulate_tcp_handshake(
    parameters: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(parameters, dict):
        raise ValueError("TCP parameters must be an object.")

    _validate_parameter_names(parameters)

    latency_spec = TCP_PARAMETER_SPECS["latency_ms"]
    latency_ms = _get_integer_parameter(
        parameters=parameters,
        name="latency_ms",
        default=latency_spec.default,
        minimum=latency_spec.minimum,
        maximum=latency_spec.maximum,
    )

    client_sequence_spec = TCP_PARAMETER_SPECS[
        "client_initial_sequence"
    ]
    client_sequence = _get_integer_parameter(
        parameters=parameters,
        name="client_initial_sequence",
        default=client_sequence_spec.default,
        minimum=client_sequence_spec.minimum,
        maximum=client_sequence_spec.maximum,
    )

    server_sequence_spec = TCP_PARAMETER_SPECS[
        "server_initial_sequence"
    ]
    server_sequence = _get_integer_parameter(
        parameters=parameters,
        name="server_initial_sequence",
        default=server_sequence_spec.default,
        minimum=server_sequence_spec.minimum,
        maximum=server_sequence_spec.maximum,
    )

    client_next_sequence = _next_sequence_number(
        client_sequence
    )

    server_next_sequence = _next_sequence_number(
        server_sequence
    )

    events = [
        {
            "step": 1,
            "sent_at_ms": 0,
            "arrives_at_ms": latency_ms,
            "source": "client",
            "destination": "server",
            "flags": ["SYN"],
            "sequence_number": client_sequence,
            "acknowledgment_number": None,
            "client_state": "SYN_SENT",
            "server_state": "LISTEN",
            "description": (
                "Client requests a new TCP connection."
            ),
        },
        {
            "step": 2,
            "sent_at_ms": latency_ms,
            "arrives_at_ms": latency_ms * 2,
            "source": "server",
            "destination": "client",
            "flags": ["SYN", "ACK"],
            "sequence_number": server_sequence,
            "acknowledgment_number": (
                client_next_sequence
            ),
            "client_state": "SYN_SENT",
            "server_state": "SYN_RECEIVED",
            "description": (
                "Server accepts the request and "
                "acknowledges the client's "
                "sequence number."
            ),
        },
        {
            "step": 3,
            "sent_at_ms": latency_ms * 2,
            "arrives_at_ms": latency_ms * 3,
            "source": "client",
            "destination": "server",
            "flags": ["ACK"],
            "sequence_number": client_next_sequence,
            "acknowledgment_number": (
                server_next_sequence
            ),
            "client_state": "ESTABLISHED",
            "server_state": "SYN_RECEIVED",
            "description": (
                "Client acknowledges the server's "
                "sequence number."
            ),
        },
    ]

    return {
        "handshake": "TCP Three-Way Handshake",
        "events": events,
        "final_state": {
            "client": "ESTABLISHED",
            "server": "ESTABLISHED",
        },
        "connection_established": True,
        "total_duration_ms": latency_ms * 3,
    }
