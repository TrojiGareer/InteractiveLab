from typing import Any

import pytest
from fastapi.testclient import TestClient


def create_scenario(
    client: TestClient,
    *,
    name: str = "TCP scenario",
    description: str | None = "A saved handshake.",
    parameters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    response = client.post(
        "/api/v1/scenarios",
        json={
            "name": name,
            "description": description,
            "protocol": "tcp",
            "parameters": parameters or {},
        },
    )

    assert response.status_code == 201
    return response.json()


def test_health_endpoints(client: TestClient):
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/health/db").json() == {"database": "ok"}


def test_protocol_catalog_endpoints(client: TestClient):
    list_response = client.get("/api/v1/protocols")
    protocol_response = client.get("/api/v1/protocols/tcp")

    assert list_response.status_code == 200
    assert list_response.json()["items"][0]["id"] == "tcp"
    assert protocol_response.status_code == 200
    assert protocol_response.json()["name"] == "TCP Three-Way Handshake"
    assert {
        parameter["name"]
        for parameter in protocol_response.json()["parameters"]
    } == {
        "latency_ms",
        "client_initial_sequence",
        "server_initial_sequence",
    }
    assert client.get("/api/v1/protocols/udp").status_code == 404


def test_create_direct_simulation_and_read_it(client: TestClient):
    create_response = client.post(
        "/api/v1/simulations",
        json={
            "protocol": " TCP ",
            "input_parameters": {
                "latency_ms": 25,
                "client_initial_sequence": 8,
                "server_initial_sequence": 12,
            },
        },
    )

    assert create_response.status_code == 201
    simulation = create_response.json()
    assert simulation["scenario_id"] is None
    assert simulation["protocol"] == "tcp"
    assert simulation["result"]["total_duration_ms"] == 75

    read_response = client.get(
        f"/api/v1/simulations/{simulation['id']}"
    )
    assert read_response.status_code == 200
    assert read_response.json()["id"] == simulation["id"]


def test_list_simulations_uses_pagination(client: TestClient):
    for latency in (10, 20, 30):
        response = client.post(
            "/api/v1/simulations",
            json={
                "protocol": "tcp",
                "input_parameters": {"latency_ms": latency},
            },
        )
        assert response.status_code == 201

    response = client.get("/api/v1/simulations?skip=1&limit=1")

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 3
    assert payload["skip"] == 1
    assert payload["limit"] == 1
    assert len(payload["items"]) == 1
    assert payload["items"][0]["input_parameters"]["latency_ms"] == 20


@pytest.mark.parametrize(
    ("payload", "status_code"),
    [
        ({"protocol": "udp", "input_parameters": {}}, 400),
        (
            {"protocol": "tcp", "input_parameters": {"latency_ms": -1}},
            422,
        ),
        (
            {"protocol": "tcp", "input_parameters": {"not_a_tcp_option": 1}},
            422,
        ),
    ],
)
def test_create_simulation_rejects_invalid_configuration(
    client: TestClient,
    payload: dict[str, Any],
    status_code: int,
):
    response = client.post("/api/v1/simulations", json=payload)

    assert response.status_code == status_code


def test_simulation_not_found_and_pagination_validation(client: TestClient):
    assert client.get("/api/v1/simulations/999999").status_code == 404
    assert client.get("/api/v1/simulations?skip=-1").status_code == 422
    assert client.get("/api/v1/simulations?limit=0").status_code == 422
    assert client.get("/api/v1/simulations?limit=101").status_code == 422


def test_create_scenario_normalizes_name(client: TestClient):
    scenario = create_scenario(client, name="  Trimmed name  ")

    assert scenario["name"] == "Trimmed name"


def test_scenario_rejects_whitespace_only_name(client: TestClient):
    response = client.post(
        "/api/v1/scenarios",
        json={
            "name": "   ",
            "description": None,
            "protocol": "tcp",
            "parameters": {},
        },
    )

    assert response.status_code == 422


def test_list_and_read_scenarios(client: TestClient):
    first = create_scenario(client, name="First")
    create_scenario(client, name="Second")

    list_response = client.get("/api/v1/scenarios?skip=1&limit=1")
    read_response = client.get(f"/api/v1/scenarios/{first['id']}")

    assert list_response.status_code == 200
    assert list_response.json()["total"] == 2
    assert len(list_response.json()["items"]) == 1
    assert read_response.status_code == 200
    assert read_response.json()["name"] == "First"


def test_replace_scenario_and_require_all_fields(client: TestClient):
    scenario = create_scenario(client)

    replace_response = client.put(
        f"/api/v1/scenarios/{scenario['id']}",
        json={
            "name": "Replacement",
            "description": "Entirely new values.",
            "protocol": "tcp",
            "parameters": {"latency_ms": 50},
        },
    )
    invalid_replace_response = client.put(
        f"/api/v1/scenarios/{scenario['id']}",
        json={"name": "Incomplete"},
    )

    assert replace_response.status_code == 200
    assert replace_response.json()["parameters"] == {"latency_ms": 50}
    assert invalid_replace_response.status_code == 422


def test_patch_scenario_fields_and_allow_null_description(client: TestClient):
    scenario = create_scenario(client, description="Remove this")

    patch_response = client.patch(
        f"/api/v1/scenarios/{scenario['id']}",
        json={"name": "Changed", "description": None},
    )

    assert patch_response.status_code == 200
    assert patch_response.json()["name"] == "Changed"
    assert patch_response.json()["description"] is None


def test_patch_scenario_rejects_empty_or_null_required_fields(
    client: TestClient,
):
    scenario = create_scenario(client)
    url = f"/api/v1/scenarios/{scenario['id']}"

    assert client.patch(url, json={}).status_code == 400

    for field in ("name", "protocol", "parameters"):
        assert client.patch(url, json={field: None}).status_code == 422


@pytest.mark.parametrize(
    "method",
    ("get", "put", "patch", "post", "delete"),
)
def test_missing_scenario_returns_not_found(client: TestClient, method: str):
    url = "/api/v1/scenarios/999999"
    request = getattr(client, method)

    if method == "put":
        response = request(
            url,
            json={
                "name": "Missing",
                "description": None,
                "protocol": "tcp",
                "parameters": {},
            },
        )
    elif method == "patch":
        response = request(url, json={"name": "Missing"})
    elif method == "post":
        response = request(f"{url}/run")
    else:
        response = request(url)

    assert response.status_code == 404


def test_delete_scenario_returns_no_content(client: TestClient):
    scenario = create_scenario(client)

    response = client.delete(f"/api/v1/scenarios/{scenario['id']}")

    assert response.status_code == 204
    assert response.content == b""
    assert client.get(f"/api/v1/scenarios/{scenario['id']}").status_code == 404


def test_running_scenario_snapshots_parameters_and_preserves_history(
    client: TestClient,
):
    scenario = create_scenario(
        client,
        parameters={
            "latency_ms": 40,
            "client_initial_sequence": 100,
        },
    )

    run_response = client.post(f"/api/v1/scenarios/{scenario['id']}/run")

    assert run_response.status_code == 201
    simulation = run_response.json()
    assert simulation["scenario_id"] == scenario["id"]
    assert simulation["input_parameters"] == {
        "latency_ms": 40,
        "client_initial_sequence": 100,
    }

    patch_response = client.patch(
        f"/api/v1/scenarios/{scenario['id']}",
        json={"parameters": {"latency_ms": 5}},
    )
    assert patch_response.status_code == 200

    historical_response = client.get(
        f"/api/v1/simulations/{simulation['id']}"
    )
    assert historical_response.status_code == 200
    assert historical_response.json()["input_parameters"] == {
        "latency_ms": 40,
        "client_initial_sequence": 100,
    }

    delete_response = client.delete(
        f"/api/v1/scenarios/{scenario['id']}"
    )
    assert delete_response.status_code == 204

    preserved_run = client.get(f"/api/v1/simulations/{simulation['id']}")
    assert preserved_run.status_code == 200
    assert preserved_run.json()["scenario_id"] is None
