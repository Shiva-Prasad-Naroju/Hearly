from __future__ import annotations

import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Repo root is two levels up from this file: backend/app/config.py -> backend/ -> repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env"


def _load_env_file(path: Path) -> None:
    """Load KEY=value pairs without depending on python-dotenv being installed."""
    if not path.exists():
        return
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and not os.environ.get(key, "").strip():
            os.environ[key] = value


_load_env_file(ENV_FILE)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE), env_file_encoding="utf-8", extra="ignore")

    groq_api_key: str = ""
    sarvam_api_key: str = ""

    database_url: str = f"sqlite+aiosqlite:///{(REPO_ROOT / 'backend' / 'hearly.db').as_posix()}"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cors_origin_regex: str = (
        r"https?://("
        r"localhost|127\.0\.0\.1|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
        r")(:\d+)?"
    )

    # STT
    groq_stt_model: str = "whisper-large-v3-turbo"

    # LLM
    groq_llm_model: str = "openai/gpt-oss-20b"

    # TTS
    sarvam_tts_model: str = "bulbul:v2"
    sarvam_tts_speaker: str = "anushka"
    sarvam_tts_language: str = "en-IN"

    # Extraction cadence
    extraction_min_new_words: int = 18
    extraction_min_new_turns: int = 3

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


def get_settings() -> Settings:
    _load_env_file(ENV_FILE)
    return Settings()
