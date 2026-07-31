import pytest

from app.services.simulators.tcp import simulate_tcp_handshake


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


def test_tcp_handshake_rejects_invalid_sequence_number():
    with pytest.raises(
        ValueError,
        match="client_initial_sequence",
    ):
        simulate_tcp_handshake(
            {
                "client_initial_sequence": -1,
            }
        )