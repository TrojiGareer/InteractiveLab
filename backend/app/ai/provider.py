from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import settings


class AIProviderError(RuntimeError):
    """Raised when the configured AI provider cannot complete a request."""


class AIProvider(ABC):
    @abstractmethod
    def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
    ) -> str:
        """Generate a text response from the AI provider."""


class DemoAIProvider(AIProvider):
    """Deterministic no-network provider used for demos and local development.

    Simulation-aware demo responses are assembled by AIService. This provider
    exists as a safe fallback for prompts that do not need structured data.
    """

    def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
    ) -> str:
        del system_prompt, user_prompt
        return (
            "Demo AI mode is enabled. This response was generated locally; "
            "no external AI provider or API key was used."
        )


class OpenAIProvider(AIProvider):
    """Minimal server-side OpenAI Responses API client."""

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str,
        timeout_seconds: float,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def generate(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
    ) -> str:
        url = f"{self.base_url}/responses"
        payload: dict[str, Any] = {
            "model": self.model,
            "instructions": system_prompt,
            "input": user_prompt,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(url, headers=headers, json=payload)
        except httpx.TimeoutException as error:
            raise AIProviderError(
                "The AI provider request timed out."
            ) from error
        except httpx.HTTPError as error:
            raise AIProviderError(
                "The AI provider could not be reached."
            ) from error

        if response.status_code >= 400:
            # Do not send raw provider error messages (which may contain
            # request metadata) back to public API clients.
            raise AIProviderError(
                f"The AI provider returned HTTP {response.status_code}."
            )

        try:
            response_payload = response.json()
        except ValueError as error:
            raise AIProviderError(
                "The AI provider returned invalid JSON."
            ) from error

        text = self._extract_text(response_payload)
        if not text:
            raise AIProviderError(
                "The AI provider returned an empty response."
            )
        return text

    @staticmethod
    def _extract_text(payload: dict[str, Any]) -> str:
        output_text = payload.get("output_text")
        if isinstance(output_text, str) and output_text.strip():
            return output_text.strip()

        output = payload.get("output")
        if not isinstance(output, list):
            return ""

        text_parts: list[str] = []
        for item in output:
            if not isinstance(item, dict):
                continue
            content = item.get("content")
            if not isinstance(content, list):
                continue
            for content_item in content:
                if not isinstance(content_item, dict):
                    continue
                if content_item.get("type") != "output_text":
                    continue
                text = content_item.get("text")
                if isinstance(text, str) and text.strip():
                    text_parts.append(text.strip())
        return "\n\n".join(text_parts)


def create_ai_provider() -> AIProvider:
    if settings.ai_mode == "demo":
        return DemoAIProvider()

    if not settings.openai_api_key:
        raise AIProviderError(
            "AI provider mode is enabled but OPENAI_API_KEY is not configured."
        )

    return OpenAIProvider(
        api_key=settings.openai_api_key,
        model=settings.openai_model,
        base_url=settings.openai_base_url,
        timeout_seconds=settings.openai_timeout_seconds,
    )
