from typing import Any


MAX_TCP_SEQUENCE_NUMBER = 2**32 - 1


def _get_integer_parameter(
    parameters: dict[str, Any],
    name: str,
    default: int,
    minimum: int,
    maximum: int,
) -> int:
    value = parameters.get(name, default)

    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"'{name}' must be an integer.")

    if value < minimum or value > maximum:
        raise ValueError(
            f"'{name}' must be between {minimum} and {maximum}."
        )

    return value


def simulate_tcp_handshake(
    parameters: dict[str, Any],
) -> dict[str, Any]:
    latency_ms = _get_integer_parameter(
        parameters=parameters,
        name="latency_ms",
        default=100,
        minimum=0,
        maximum=5000,
    )

    client_sequence = _get_integer_parameter(
        parameters=parameters,
        name="client_initial_sequence",
        default=1000,
        minimum=0,
        maximum=MAX_TCP_SEQUENCE_NUMBER,
    )

    server_sequence = _get_integer_parameter(
        parameters=parameters,
        name="server_initial_sequence",
        default=5000,
        minimum=0,
        maximum=MAX_TCP_SEQUENCE_NUMBER,
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
            "acknowledgment_number": client_sequence + 1,
            "client_state": "SYN_SENT",
            "server_state": "SYN_RECEIVED",
            "description": (
                "Server accepts the request and acknowledges "
                "the client's sequence number."
            ),
        },
        {
            "step": 3,
            "sent_at_ms": latency_ms * 2,
            "arrives_at_ms": latency_ms * 3,
            "source": "client",
            "destination": "server",
            "flags": ["ACK"],
            "sequence_number": client_sequence + 1,
            "acknowledgment_number": server_sequence + 1,
            "client_state": "ESTABLISHED",
            "server_state": "SYN_RECEIVED",
            "description": (
                "Client acknowledges the server's sequence number."
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