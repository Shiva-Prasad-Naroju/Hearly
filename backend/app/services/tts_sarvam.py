from __future__ import annotations

import logging

import httpx

from app.config import get_settings

logger = logging.getLogger("hearly.tts")
settings = get_settings()

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
MAX_CHARS = 2000  # stay comfortably under the 2500-char REST limit


async def synthesize(text: str, language_code: str | None = None, speaker: str | None = None) -> str:
    """Returns a base64-encoded WAV string. Raises RuntimeError on failure."""
    if not settings.sarvam_api_key:
        raise RuntimeError("SARVAM_API_KEY is not set. Add it to your .env file.")

    text = text[:MAX_CHARS]

    payload = {
        "text": text,
        "language_code": language_code or settings.sarvam_tts_language,
        "speaker": speaker or settings.sarvam_tts_speaker,
        "model": settings.sarvam_tts_model,
        "pace": 1.0,
        "speech_sample_rate": 24000,
    }
    headers = {
        "api-subscription-key": settings.sarvam_api_key,
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(SARVAM_TTS_URL, json=payload, headers=headers)
        if resp.status_code >= 400:
            logger.error("Sarvam TTS error %s: %s", resp.status_code, resp.text[:500])
            raise RuntimeError(f"Sarvam TTS failed: {resp.status_code}")
        data = resp.json()
        audios = data.get("audios") or []
        if not audios:
            raise RuntimeError("Sarvam TTS returned no audio")
        return audios[0]
