import pytest

from app.services.simulators.tcp import (
    MAX_TCP_SEQUENCE_NUMBER,
    simulate_tcp_handshake,
)


def test_tcp_handshake_uses_default_values():
    result = simulate_tcp_handshake({})

    events = result["events"]

    assert result["handshake"] == "TCP Three-Way Handshake"
    assert result["connection_established"] is True
    assert result["total_duration_ms"] == 300

    assert len(events) == 3

    assert events[0]["flags"] == ["SYN"]
    assert events[1]["flags"] == ["SYN", "ACK"]
    assert events[2]["flags"] == ["ACK"]

    assert events[0]["sequence_number"] == 1000
    assert events[1]["acknowledgment_number"] == 1001
    assert events[2]["acknowledgment_number"] == 5001

    assert result["final_state"] == {
        "client": "ESTABLISHED",
        "server": "ESTABLISHED",
    }


def test_tcp_handshake_uses_custom_parameters():
    result = simulate_tcp_handshake(
        {
            "latency_ms": 250,
            "client_initial_sequence": 20,
            "server_initial_sequence": 80,
        }
    )

    events = result["events"]

    assert result["total_duration_ms"] == 750

    assert events[0]["arrives_at_ms"] == 250
    assert events[1]["arrives_at_ms"] == 500
    assert events[2]["arrives_at_ms"] == 750

    assert events[1]["acknowledgment_number"] == 21
    assert events[2]["acknowledgment_number"] == 81


def test_tcp_handshake_rejects_negative_latency():
    with pytest.raises(ValueError, match="latency_ms"):
        simulate_tcp_handshake(
            {
                "latency_ms": -10,
            }
        )


def test_tcp_handshake_rejects_non_integer_latency():
    with pytest.raises(ValueError, match="latency_ms"):
        simulate_tcp_handshake(
            {
                "latency_ms": "fast",
            }
        )


def test_tcp_handshake_rejects_boolean_values():
    with pytest.raises(ValueError, match="latency_ms"):
        simulate_tcp_handshake(
            {
                "latency_ms": True,
            }
        )


@pytest.mark.parametrize(
    ("parameters", "parameter_name"),
    [
        ({"latency_ms": 5001}, "latency_ms"),
        ({"client_initial_sequence": -1}, "client_initial_sequence"),
        (
            {
                "server_initial_sequence": (
                    MAX_TCP_SEQUENCE_NUMBER + 1
                ),
            },
            "server_initial_sequence",
        ),
    ],
)
def test_tcp_handshake_rejects_out_of_range_values(
    parameters,
    parameter_name,
):
    with pytest.raises(
        ValueError,
        match=parameter_name,
    ):
        simulate_tcp_handshake(parameters)


def test_tcp_handshake_rejects_unknown_parameter():
    with pytest.raises(ValueError, match="Unsupported TCP parameter"):
        simulate_tcp_handshake({"packet_loss": 1})


def test_tcp_handshake_wraps_sequence_numbers_at_uint32_boundary():
    result = simulate_tcp_handshake(
        {
            "client_initial_sequence": MAX_TCP_SEQUENCE_NUMBER,
            "server_initial_sequence": MAX_TCP_SEQUENCE_NUMBER,
        }
    )

    events = result["events"]

    assert events[1]["acknowledgment_number"] == 0
    assert events[2]["sequence_number"] == 0
    assert events[2]["acknowledgment_number"] == 0
