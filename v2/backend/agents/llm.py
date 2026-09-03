"""
agents/llm.py — Optional real-LLM layer for Jan Setu.

The 4 AI agents ship with a deterministic keyword-based simulation that works
completely offline. When the operator configures an LLM provider (via the
LLM_PROVIDER + LLM_API_KEY environment variables), the agents can instead call a
real model for richer, context-aware reasoning.

Design goals
------------
* **Never a hard dependency.** If no key is set, or the provider is "none", or
  the network call fails for any reason, callers transparently fall back to the
  keyword simulation. The system must remain runnable with zero configuration.
* **Provider-agnostic.** OpenAI, Anthropic, and Gemini chat/completions APIs are
  supported through a single `complete_json()` helper. All speak plain HTTPS.
* **Structured output.** Agents need JSON, so we ask for JSON and defensively
  parse whatever comes back.

Usage
-----
    from agents.llm import llm, LLMUnavailable

    if llm.enabled:
        try:
            data = llm.complete_json(system_prompt, user_prompt)
        except LLMUnavailable:
            data = None   # caller falls back to simulation
"""
from __future__ import annotations

import json
import re
from typing import Optional

from config import settings


class LLMUnavailable(Exception):
    """Raised when a real-LLM call cannot be completed for any reason."""


# ─────────────────────────────────────────────
# HTTP helper — prefers `requests`, falls back to stdlib urllib.
# ─────────────────────────────────────────────
def _http_post_json(url: str, headers: dict, payload: dict, timeout: float) -> dict:
    body = json.dumps(payload).encode("utf-8")
    try:
        import requests  # type: ignore
        resp = requests.post(url, headers=headers, data=body, timeout=timeout)
        if resp.status_code >= 400:
            raise LLMUnavailable(f"HTTP {resp.status_code}: {resp.text[:200]}")
        return resp.json()
    except ImportError:
        # Pure-stdlib fallback so `requests` is never strictly required.
        import urllib.request
        import urllib.error
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:  # pragma: no cover - network dependent
            detail = e.read().decode("utf-8", "ignore")[:200]
            raise LLMUnavailable(f"HTTP {e.code}: {detail}")
        except Exception as e:  # pragma: no cover - network dependent
            raise LLMUnavailable(str(e))
    except LLMUnavailable:
        raise
    except Exception as e:  # pragma: no cover - network dependent
        raise LLMUnavailable(str(e))


def _extract_json(text: str) -> dict:
    """Pull the first JSON object out of a model response, tolerating code fences
    and leading/trailing prose."""
    if not text:
        raise LLMUnavailable("Empty LLM response")
    # Strip ```json ... ``` fences if present.
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    candidate = fenced.group(1) if fenced else text
    # Otherwise grab the outermost braces.
    if not fenced:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = candidate[start : end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e:
        raise LLMUnavailable(f"Could not parse JSON from LLM: {e}")


# ─────────────────────────────────────────────
# Provider defaults
# ─────────────────────────────────────────────
_DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "anthropic": "claude-3-5-haiku-latest",
    "gemini": "gemini-1.5-flash",
}
_DEFAULT_BASE_URLS = {
    "openai": "https://api.openai.com/v1",
    "anthropic": "https://api.anthropic.com/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta",
}


class LLMClient:
    """Thin, provider-agnostic client. Safe to instantiate even with no config."""

    def __init__(self) -> None:
        self.provider = settings.LLM_PROVIDER
        self.api_key = settings.LLM_API_KEY
        self.timeout = settings.LLM_TIMEOUT
        self.model = settings.LLM_MODEL or _DEFAULT_MODELS.get(self.provider, "")
        self.base_url = (settings.LLM_BASE_URL or _DEFAULT_BASE_URLS.get(self.provider, "")).rstrip("/")

    @property
    def enabled(self) -> bool:
        return settings.llm_enabled

    # ── Public API ───────────────────────────
    def complete_json(self, system_prompt: str, user_prompt: str) -> dict:
        """Return a parsed JSON object from the configured provider.

        Raises LLMUnavailable on any failure so callers can fall back cleanly.
        """
        if not self.enabled:
            raise LLMUnavailable("LLM layer disabled (no provider/key configured)")

        if self.provider == "openai":
            return self._openai(system_prompt, user_prompt)
        if self.provider == "anthropic":
            return self._anthropic(system_prompt, user_prompt)
        if self.provider == "gemini":
            return self._gemini(system_prompt, user_prompt)
        raise LLMUnavailable(f"Unknown LLM provider: {self.provider!r}")

    # ── Providers ────────────────────────────
    def _openai(self, system_prompt: str, user_prompt: str) -> dict:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        data = _http_post_json(url, headers, payload, self.timeout)
        try:
            content = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise LLMUnavailable("Malformed OpenAI response")
        return _extract_json(content)

    def _anthropic(self, system_prompt: str, user_prompt: str) -> dict:
        url = f"{self.base_url}/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "max_tokens": 1024,
            "temperature": 0.2,
            "system": system_prompt + "\n\nRespond ONLY with a valid JSON object.",
            "messages": [{"role": "user", "content": user_prompt}],
        }
        data = _http_post_json(url, headers, payload, self.timeout)
        try:
            content = data["content"][0]["text"]
        except (KeyError, IndexError, TypeError):
            raise LLMUnavailable("Malformed Anthropic response")
        return _extract_json(content)

    def _gemini(self, system_prompt: str, user_prompt: str) -> dict:
        url = f"{self.base_url}/models/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "system_instruction": {"parts": [{"text": system_prompt + "\n\nRespond ONLY with a valid JSON object."}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
        }
        data = _http_post_json(url, headers, payload, self.timeout)
        try:
            content = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError):
            raise LLMUnavailable("Malformed Gemini response")
        return _extract_json(content)


# Singleton used across the agents.
llm = LLMClient()
