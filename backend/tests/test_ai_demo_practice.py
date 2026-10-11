from typing import Any

from fastapi.testclient import TestClient

from app.ai.provider import DemoAIProvider, create_ai_provider
from app.ai.service import AIService, get_ai_service
from app.core.config import settings
from app.main import app


class DemoServiceForTests(AIService):
    def __init__(self) -> None:
        super().__init__(DemoAIProvider())


def create_simulation(client: TestClient, parameters: dict[str, Any] | None = None) -> dict[str, Any]:
    response = client.post(
        "/api/v1/simulations",
        json={"protocol": "tcp", "input_parameters": parameters or {}},
    )
    assert response.status_code == 201
    return response.json()


def test_demo_mode_does_not_require_api_key(monkeypatch):
    monkeypatch.setattr(settings, "ai_mode", "demo")
    monkeypatch.setattr(settings, "openai_api_key", None)
    assert isinstance(create_ai_provider(), DemoAIProvider)


def test_demo_explain_and_report_work_without_provider_key(client: TestClient):
    app.dependency_overrides[get_ai_service] = DemoServiceForTests
    simulation = create_simulation(client, {"latency_ms": 12})

    explain = client.post(f"/api/v1/ai/explain/{simulation['id']}")
    report = client.post(
        "/api/v1/ai/report",
        json={"simulation_id": simulation["id"]},
    )

    assert explain.status_code == 200
    assert "Demo mode" in explain.json()["content"]
    assert "SYN" in explain.json()["content"]
    assert report.status_code == 200
    assert "Network Analysis Report" in report.json()["content"]
    app.dependency_overrides.clear()


def test_practice_question_is_derived_from_saved_simulation(client: TestClient):
    app.dependency_overrides[get_ai_service] = DemoServiceForTests
    simulation = create_simulation(
        client,
        {"latency_ms": 17, "client_initial_sequence": 100, "server_initial_sequence": 500},
    )

    response = client.post(
        "/api/v1/ai/practice/question",
        json={"simulation_id": simulation["id"], "level": "intermediate"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["simulation_id"] == simulation["id"]
    assert payload["question_id"] == "tcp-client-ack"
    assert "acknowledgment number" in payload["question"]
    app.dependency_overrides.clear()


def test_practice_evaluates_correct_and_incorrect_answers(client: TestClient):
    app.dependency_overrides[get_ai_service] = DemoServiceForTests
    simulation = create_simulation(client, {"latency_ms": 17})
    question = client.post(
        "/api/v1/ai/practice/question",
        json={"simulation_id": simulation["id"], "level": "beginner"},
    ).json()

    correct = client.post(
        "/api/v1/ai/practice/evaluate",
        json={
            "simulation_id": simulation["id"],
            "question_id": question["question_id"],
            "answer": " syn, SYN-ACK, ack ",
        },
    )
    incorrect = client.post(
        "/api/v1/ai/practice/evaluate",
        json={
            "simulation_id": simulation["id"],
            "question_id": question["question_id"],
            "answer": "ACK, SYN, SYN-ACK",
        },
    )

    assert correct.status_code == 200
    assert correct.json()["is_correct"] is True
    assert incorrect.status_code == 200
    assert incorrect.json()["is_correct"] is False
    assert incorrect.json()["correct_answer"] == "SYN, SYN-ACK, ACK"
    app.dependency_overrides.clear()


def test_practice_rejects_unknown_question_and_missing_simulation(client: TestClient):
    app.dependency_overrides[get_ai_service] = DemoServiceForTests
    simulation = create_simulation(client)

    unknown = client.post(
        "/api/v1/ai/practice/evaluate",
        json={
            "simulation_id": simulation["id"],
            "question_id": "not-a-real-question",
            "answer": "anything",
        },
    )
    missing = client.post(
        "/api/v1/ai/practice/question",
        json={"simulation_id": 999999, "level": "beginner"},
    )

    assert unknown.status_code == 422
    assert missing.status_code == 404
    app.dependency_overrides.clear()
