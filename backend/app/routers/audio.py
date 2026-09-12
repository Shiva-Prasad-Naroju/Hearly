from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_db
from app.models import Session, TranscriptSegment, Participant
from app.schemas import AudioChunkResponse, SegmentOut, EventOut, AlertOut, PendingActionOut, ParticipantOut
from app.services import stt_groq, llm_groq, state_engine
from app.services.salience import should_extract

logger = logging.getLogger("hearly.audio")
router = APIRouter(prefix="/api/sessions", tags=["audio"])
settings = get_settings()


def _build_state_card(session: Session) -> str:
    return session.running_summary or "(conversation just started, no summary yet)"


@router.post("/{session_id}/audio-chunk", response_model=AudioChunkResponse)
async def upload_audio_chunk(
    session_id: str,
    speaker_label: str = Form("speaker_1"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status != "live":
        raise HTTPException(status_code=409, detail=f"Session is not live (status={session.status})")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio chunk")

    # Determine offset for this chunk from the latest segment's end_ms
    max_end_result = await db.execute(
        select(func.max(TranscriptSegment.end_ms)).where(TranscriptSegment.session_id == session_id)
    )
    base_offset_ms = max_end_result.scalar() or 0

    filename = file.filename or "chunk.webm"
    if "." not in filename:
        filename = "chunk.webm"
    content_type = file.content_type or "audio/webm"

    try:
        chunk = await stt_groq.transcribe_chunk(audio_bytes, filename, base_offset_ms, content_type)
    except Exception as e:
        logger.error("STT transcription failed: %s", e)
        raise HTTPException(status_code=502, detail=f"Speech-to-text failed: {e}")

    new_segments: list[TranscriptSegment] = []

    if not chunk.is_silence and chunk.text:
        seq_result = await db.execute(
            select(func.count()).select_from(TranscriptSegment).where(TranscriptSegment.session_id == session_id)
        )
        next_sequence = (seq_result.scalar() or 0) + 1

        segment = TranscriptSegment(
            session_id=session_id,
            sequence=next_sequence,
            speaker_label=speaker_label,
            text=chunk.text,
            start_ms=chunk.start_ms,
            end_ms=max(chunk.end_ms, chunk.start_ms + 1000),
            confidence=chunk.confidence,
        )
        db.add(segment)
        await db.flush()
        new_segments.append(segment)

        # Track rough speaking time per participant
        result = await db.execute(
            select(Participant).where(Participant.session_id == session_id, Participant.speaker_label == speaker_label)
        )
        participant = result.scalar_one_or_none()
        if participant is None:
            participant = Participant(session_id=session_id, speaker_label=speaker_label, total_speech_ms=0)
            db.add(participant)
        spoken_ms = max(0, (segment.end_ms or 0) - (segment.start_ms or 0))
        participant.total_speech_ms = (participant.total_speech_ms or 0) + spoken_ms

        await db.commit()

    # ---- Extraction gate: only look at finalized segments since the last watermark ----
    new_events: list = []
    new_alerts: list = []
    new_actions: list = []
    extraction_ran = False

    all_segments_result = await db.execute(
        select(TranscriptSegment)
        .where(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.sequence)
    )
    all_segments = all_segments_result.scalars().all()
    unprocessed = [s for s in all_segments if s.sequence > session.last_processed_index]

    if unprocessed:
        window_text = "\n".join(f"{s.speaker_label}: {s.text}" for s in unprocessed)
        word_count = len(window_text.split())
        if (
            should_extract(window_text, settings.extraction_min_new_words)
            or len(unprocessed) >= 3
            or word_count >= 12
        ):
            state_card = _build_state_card(session)
            patch = await llm_groq.extract_window(state_card, window_text)
            extraction_ran = True
            if patch is not None:
                new_events, new_alerts, new_actions = await state_engine.apply_patch(db, session, patch, window_text)
            session.last_processed_index = unprocessed[-1].sequence
            db.add(session)
            await db.commit()

    await db.refresh(session)
    participants_result = await db.execute(select(Participant).where(Participant.session_id == session_id))
    participants = participants_result.scalars().all()

    return AudioChunkResponse(
        segments=[SegmentOut.model_validate(s) for s in new_segments],
        events=[EventOut.model_validate(e) for e in new_events],
        alerts=[AlertOut.model_validate(a) for a in new_alerts],
        pending_actions=[PendingActionOut.model_validate(a) for a in new_actions],
        participants=[ParticipantOut.model_validate(p) for p in participants],
        running_summary=session.running_summary,
        extraction_ran=extraction_ran,
    )
