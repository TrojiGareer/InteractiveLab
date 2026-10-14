from typing import Any

from fastapi.testclient import TestClient

from app.ai.service import get_ai_service
from app.main import app


class FakeAIService:
    def explain(self, simulation):
        return (
            "The simulation completed a TCP three-way handshake."
        )

    def troubleshoot(
        self,
        simulation,
        problem_description,
    ):
        return (
            "## Observed evidence\n"
            "The simulation completed successfully.\n\n"
            "## Possible causes\n"
            "No failure is visible in this simulation."
        )

    def practice(
        self,
        simulation,
        question_count,
    ):
        return "\n".join(
            f"{index}. Practice question"
            for index in range(1, question_count + 1)
        )

    def report(
        self,
        simulation,
        analysis,
    ):
        return (
            "# Network Analysis Report\n\n"
            "## Executive Summary\n"
            "The simulated TCP handshake completed successfully."
        )


def create_simulation(
    client: TestClient,
    parameters: dict[str, Any] | None = None,
) -> dict[str, Any]:
    response = client.post(
        "/api/v1/simulations",
        json={
            "protocol": "tcp",
            "input_parameters": parameters or {},
        },
    )

    assert response.status_code == 201

    return response.json()


def test_explain_simulation(
    client: TestClient,
):
    app.dependency_overrides[
        get_ai_service
    ] = lambda: FakeAIService()

    simulation = create_simulation(
        client,
        {"latency_ms": 25},
    )

    response = client.post(
        f"/api/v1/ai/explain/{simulation['id']}"
    )

    assert response.status_code == 200

    payload = response.json()

    assert payload["simulation_id"] == simulation["id"]
    assert "three-way handshake" in payload["content"]


def test_troubleshoot_simulation(
    client: TestClient,
):
    app.dependency_overrides[
        get_ai_service
    ] = lambda: FakeAIService()

    simulation = create_simulation(client)

    response = client.post(
        "/api/v1/ai/troubleshoot",
        json={
            "simulation_id": simulation["id"],
            "problem_description": (
                "Why did the connection take longer?"
            ),
        },
    )

    assert response.status_code == 200

    payload = response.json()

    assert payload["simulation_id"] == simulation["id"]
    assert (
        payload["problem_description"]
        == "Why did the connection take longer?"
    )
    assert "Observed evidence" in payload["content"]


def test_practice_simulation(
    client: TestClient,
):
    app.dependency_overrides[
        get_ai_service
    ] = lambda: FakeAIService()

    simulation = create_simulation(client)

    response = client.post(
        "/api/v1/ai/practice",
        json={
            "simulation_id": simulation["id"],
            "question_count": 4,
        },
    )

    assert response.status_code == 200

    payload = response.json()

    assert payload["simulation_id"] == simulation["id"]
    assert payload["question_count"] == 4
    assert payload["content"].count(
        "Practice question"
    ) == 4


def test_generate_report(
    client: TestClient,
):
    app.dependency_overrides[
        get_ai_service
    ] = lambda: FakeAIService()

    simulation = create_simulation(client)

    response = client.post(
        "/api/v1/ai/report",
        json={
            "simulation_id": simulation["id"],
            "analysis": "Investigate handshake timing.",
        },
    )

    assert response.status_code == 200

    payload = response.json()

    assert payload["simulation_id"] == simulation["id"]
    assert payload["report_format"] == "markdown"
    assert "# Network Analysis Report" in payload["content"]


def test_ai_returns_404_for_missing_simulation(
    client: TestClient,
):
    app.dependency_overrides[
        get_ai_service
    ] = lambda: FakeAIService()

    response = client.post(
        "/api/v1/ai/explain/999999"
    )

    assert response.status_code == 404


def test_ai_validates_troubleshooting_input(
    client: TestClient,
):
    app.dependency_overrides[
        get_ai_service
    ] = lambda: FakeAIService()

    response = client.post(
        "/api/v1/ai/troubleshoot",
        json={
            "simulation_id": 1,
            "problem_description": "",
        },
    )

    assert response.status_code == 422


def test_ai_validates_practice_question_count(
    client: TestClient,
):
    app.dependency_overrides[
        get_ai_service
    ] = lambda: FakeAIService()

    response = client.post(
        "/api/v1/ai/practice",
        json={
            "simulation_id": 1,
            "question_count": 11,
        },
    )

    assert response.status_code == 422