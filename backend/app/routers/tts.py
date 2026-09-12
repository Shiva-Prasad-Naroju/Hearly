from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.schemas import TtsRequest, TtsResponse
from app.services import tts_sarvam

logger = logging.getLogger("hearly.tts_router")
router = APIRouter(prefix="/api", tags=["tts"])


@router.post("/tts", response_model=TtsResponse)
async def text_to_speech(body: TtsRequest):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    try:
        audio_b64 = await tts_sarvam.synthesize(body.text, body.language_code, body.speaker)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return TtsResponse(audio_base64=audio_b64, format="wav")
