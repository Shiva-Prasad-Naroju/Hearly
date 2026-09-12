from __future__ import annotations

import asyncio
import math
from dataclasses import dataclass

from groq import Groq

from app.config import get_settings

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    settings = get_settings()
    if _client is None:
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not set. Add it to your .env file.")
        _client = Groq(api_key=settings.groq_api_key)
    return _client


@dataclass
class TranscribedChunk:
    text: str
    confidence: float
    start_ms: int
    end_ms: int
    is_silence: bool = False


def _logprob_to_confidence(avg_logprob: float | None) -> float:
    if avg_logprob is None:
        return 0.85
    # avg_logprob is typically in [-1, 0] for confident speech; map to a 0..1-ish score
    return max(0.0, min(1.0, math.exp(avg_logprob)))


def _transcribe_sync(
    audio_bytes: bytes, filename: str, base_offset_ms: int, content_type: str = "audio/webm"
) -> TranscribedChunk:
    client = _get_client()
    settings = get_settings()
    result = client.audio.transcriptions.create(
        file=(filename, audio_bytes, content_type),
        model=settings.groq_stt_model,
        response_format="verbose_json",
        language="en",
        temperature=0.0,
    )

    # groq SDK returns a pydantic-like object; support both attribute and dict access
    text = (getattr(result, "text", None) or "").strip()
    segments = getattr(result, "segments", None) or []

    no_speech_scores = []
    logprobs = []
    duration_ms = 0
    for seg in segments:
        seg_dict = seg if isinstance(seg, dict) else getattr(seg, "__dict__", {})
        no_speech_scores.append(seg_dict.get("no_speech_prob", 0.0))
        logprobs.append(seg_dict.get("avg_logprob"))
        end = seg_dict.get("end")
        if end:
            duration_ms = max(duration_ms, int(end * 1000))

    avg_logprob = None
    valid_logprobs = [lp for lp in logprobs if lp is not None]
    if valid_logprobs:
        avg_logprob = sum(valid_logprobs) / len(valid_logprobs)

    avg_no_speech = sum(no_speech_scores) / len(no_speech_scores) if no_speech_scores else 0.0

    # Whisper often hallucinates short filler text on pure silence/noise.
    is_silence = (not text) or (avg_no_speech > 0.6) or (len(text) <= 2)

    return TranscribedChunk(
        text=text,
        confidence=_logprob_to_confidence(avg_logprob),
        start_ms=base_offset_ms,
        end_ms=base_offset_ms + duration_ms,
        is_silence=is_silence,
    )


async def transcribe_chunk(
    audio_bytes: bytes, filename: str, base_offset_ms: int, content_type: str = "audio/webm"
) -> TranscribedChunk:
    return await asyncio.to_thread(_transcribe_sync, audio_bytes, filename, base_offset_ms, content_type)
