"""
config.py — Central configuration for Jan Setu.

Loads settings from environment variables (optionally via a local .env file).
Nothing here is required to run the app in "demo mode": every value has a
sensible default, and the AI agents fall back to the built-in keyword
simulation when no LLM key is configured.
"""
import os
from pathlib import Path

# ─────────────────────────────────────────────
# Minimal .env loader (no external dependency)
# ─────────────────────────────────────────────
def _load_dotenv(path: Path) -> None:
    """Populate os.environ from a .env file if present. Does not override
    variables that are already set in the real environment."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        # Real environment variables win over the .env file.
        os.environ.setdefault(key, value)


_BASE_DIR = Path(__file__).resolve().parent
_load_dotenv(_BASE_DIR / ".env")


def _get_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


class Settings:
    """Application settings resolved from the environment."""

    # ── Database ─────────────────────────────
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./jan_setu.db")

    # ── CORS ─────────────────────────────────
    # Comma-separated list of allowed origins. "*" allows all (demo default).
    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()
    ]

    # ── Voice (Deepgram) ─────────────────────
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    STT_MODEL: str = os.getenv("STT_MODEL", "nova-3")
    TTS_MODEL: str = os.getenv("TTS_MODEL", "aura-2-asteria-en")

    # ── LLM provider (optional) ──────────────
    # LLM_PROVIDER: "none" (default, keyword simulation), "openai", "anthropic", "gemini"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "none").strip().lower()
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "")
    LLM_TIMEOUT: float = float(os.getenv("LLM_TIMEOUT", "20"))

    # ── Autonomous SLA scheduler ─────────────
    # When enabled, a background loop periodically runs the tracking agent's
    # escalation check so SLA breaches are caught without a manual trigger.
    SLA_SCHEDULER_ENABLED: bool = _get_bool("SLA_SCHEDULER_ENABLED", False)
    SLA_CHECK_INTERVAL_MINUTES: float = float(os.getenv("SLA_CHECK_INTERVAL_MINUTES", "15"))

    # ── Admin utilities ──────────────────────
    # Guards the demo reset/reseed endpoint so it can't be hit in production.
    ALLOW_ADMIN_RESET: bool = _get_bool("ALLOW_ADMIN_RESET", False)

    @property
    def llm_enabled(self) -> bool:
        """True only when a provider *and* an API key are both configured."""
        return self.LLM_PROVIDER not in ("", "none") and bool(self.LLM_API_KEY)

    @property
    def voice_enabled(self) -> bool:
        return bool(self.DEEPGRAM_API_KEY)


settings = Settings()
