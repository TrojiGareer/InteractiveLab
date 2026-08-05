from collections.abc import Callable
from typing import Any

from app.services.simulators.tcp import simulate_tcp_handshake


SimulatorFunction = Callable[
    [dict[str, Any]],
    dict[str, Any],
]


SIMULATORS: dict[str, SimulatorFunction] = {
    "tcp": simulate_tcp_handshake,
}


class UnsupportedProtocolError(ValueError):
    pass


def execute_simulation(
    protocol: str,
    parameters: dict[str, Any],
) -> tuple[str, dict[str, Any]]:
    normalized_protocol = protocol.strip().lower()

    simulator = SIMULATORS.get(normalized_protocol)

    if simulator is None:
        raise UnsupportedProtocolError(
            f"Protocol '{normalized_protocol}' "
            "is not supported yet."
        )

    result = simulator(parameters)

    return normalized_protocol, result