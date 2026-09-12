from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import Session, Participant, TranscriptSegment, Event, PendingAction
from app.schemas import (
    CreateSessionRequest, SessionOut, SessionDetailOut, StartSessionRequest,
    RenameParticipantRequest, ParticipantOut, AskRequest, AskResponse,
    SendMailRequest, UpdateEventRequest, EventOut, PendingActionOut,
)
from app.config import get_settings
from app.services import llm_groq, state_engine, smtp_mail

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _session_out(s: Session) -> SessionOut:
    return SessionOut(
        id=s.id,
        title=s.title,
        status=s.status,
        started_at=s.started_at.isoformat() if s.started_at else None,
        ended_at=s.ended_at.isoformat() if s.ended_at else None,
        running_summary=s.running_summary,
        report=s.report,
    )


@router.post("", response_model=SessionOut)
async def create_session(body: CreateSessionRequest, db: AsyncSession = Depends(get_db)):
    s = Session(title=body.title or "Untitled session")
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _session_out(s)


@router.get("", response_model=list[SessionOut])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).order_by(Session.created_at.desc()))
    return [_session_out(s) for s in result.scalars().all()]


async def _get_session_or_404(db: AsyncSession, session_id: str) -> Session:
    result = await db.execute(select(Session).where(Session.id == session_id))
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


@router.get("/{session_id}", response_model=SessionDetailOut)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session)
        .options(
            selectinload(Session.participants),
            selectinload(Session.segments),
            selectinload(Session.events),
            selectinload(Session.alerts),
            selectinload(Session.pending_actions),
        )
        .where(Session.id == session_id)
    )
    s = result.scalar_one_or_none()
    if s is None:
        raise HTTPException(status_code=404, detail="Session not found")

    base = _session_out(s)
    return SessionDetailOut(
        **base.model_dump(),
        participants=[ParticipantOut.model_validate(p) for p in s.participants],
        segments=sorted([seg for seg in s.segments], key=lambda x: x.sequence),
        events=list(s.events),
        alerts=list(s.alerts),
        pending_actions=list(s.pending_actions),
    )


@router.post("/{session_id}/start", response_model=SessionOut)
async def start_session(session_id: str, body: StartSessionRequest, db: AsyncSession = Depends(get_db)):
    if not body.consent_acknowledged:
        raise HTTPException(status_code=400, detail="Consent must be acknowledged before starting a session")
    s = await _get_session_or_404(db, session_id)
    s.status = "live"
    s.consent_acknowledged_at = datetime.utcnow()
    s.started_at = datetime.utcnow()
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _session_out(s)


@router.post("/{session_id}/stop", response_model=SessionOut)
async def stop_session(session_id: str, db: AsyncSession = Depends(get_db)):
    s = await _get_session_or_404(db, session_id)
    s.status = "processing"
    s.ended_at = datetime.utcnow()
    db.add(s)
    await db.commit()

    segments_result = await db.execute(
        select(TranscriptSegment)
        .where(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.sequence)
    )
    segments = segments_result.scalars().all()
    transcript_text = "\n".join(f"{seg.speaker_label}: {seg.text}" for seg in segments)

    unprocessed = [seg for seg in segments if seg.sequence > s.last_processed_index]
    if unprocessed:
        window_text = "\n".join(f"{seg.speaker_label}: {seg.text}" for seg in unprocessed)
        patch = await llm_groq.extract_window(s.running_summary or "(conversation just started)", window_text)
        if patch is not None:
            await state_engine.apply_patch(db, s, patch, window_text)
        s.last_processed_index = unprocessed[-1].sequence
        db.add(s)
        await db.commit()
        await db.refresh(s)

    events_result = await db.execute(select(Event).where(Event.session_id == session_id))
    events = events_result.scalars().all()
    participants_result = await db.execute(select(Participant).where(Participant.session_id == session_id))
    participants = participants_result.scalars().all()

    events_text = "\n".join(
        f"- [{e.type}] {e.summary}"
        + (f" (owner: {e.owner_name or e.owner_speaker_label})" if (e.owner_name or e.owner_speaker_label) else "")
        + (f" (due: {e.due_text})" if e.due_text else "")
        for e in events
    ) or "(no events were extracted)"
    participants_text = "\n".join(
        f"- {p.speaker_label}" + (f" ({p.display_name})" if p.display_name else "") for p in participants
    ) or "(no participants recorded)"

    if not transcript_text.strip():
        report = None
        fallback_summary = "No speech was captured in this session."
    else:
        report = await llm_groq.finalize_session(
            s.running_summary or "(no summary yet)",
            events_text,
            participants_text,
            transcript_text,
        )
        fallback_summary = s.running_summary or transcript_text[:600]

    s.status = "complete"
    if report:
        s.report = report.model_dump()
    else:
        s.report = {
            "summary": fallback_summary,
            "decisions": [], "action_items": [], "deadlines": [],
            "follow_ups": [], "open_questions": [], "participants": [],
        }
    db.add(s)
    await db.commit()
    await db.refresh(s)

    # Understand first (report above). Draft only if someone actually promised a mail.
    if transcript_text.strip() and state_engine.has_explicit_mail_promise(transcript_text):
        summary = (s.report or {}).get("summary") or fallback_summary
        composed = await llm_groq.compose_promised_mails(
            summary, events_text, participants_text, transcript_text
        )
        await state_engine.seed_composed_mails(db, s, composed, summary, transcript_text)
        await db.refresh(s)

    return _session_out(s)


@router.patch("/{session_id}/participants/{speaker_label}", response_model=ParticipantOut)
async def rename_participant(
    session_id: str, speaker_label: str, body: RenameParticipantRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Participant).where(Participant.session_id == session_id, Participant.speaker_label == speaker_label)
    )
    p = result.scalar_one_or_none()
    if p is None:
        p = Participant(session_id=session_id, speaker_label=speaker_label)
        db.add(p)
    p.display_name = body.display_name
    p.name_confidence = 1.0
    p.name_source = "user"
    await db.commit()
    await db.refresh(p)
    return ParticipantOut.model_validate(p)


@router.post("/{session_id}/ask", response_model=AskResponse)
async def ask_question(session_id: str, req: AskRequest, db: AsyncSession = Depends(get_db)):
    s = await _get_session_or_404(db, session_id)

    events_result = await db.execute(select(Event).where(Event.session_id == session_id))
    events = events_result.scalars().all()
    events_text = "\n".join(f"- [{e.type}] {e.summary}" for e in events) or "(no events yet)"
    segments_result = await db.execute(
        select(TranscriptSegment)
        .where(TranscriptSegment.session_id == session_id)
        .order_by(TranscriptSegment.sequence)
    )
    transcript_text = "\n".join(
        f"{seg.speaker_label}: {seg.text}" for seg in segments_result.scalars().all()
    )

    answer = await llm_groq.answer_question(
        req.question, s.running_summary or "(no summary yet)", events_text, transcript_text
    )
    return answer


@router.patch("/{session_id}/events/{event_id}", response_model=EventOut)
async def update_event(
    session_id: str, event_id: str, body: UpdateEventRequest, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Event).where(Event.id == event_id, Event.session_id == session_id)
    )
    ev = result.scalar_one_or_none()
    if ev is None:
        raise HTTPException(status_code=404, detail="Event not found")
    ev.status = body.status
    db.add(ev)
    await db.commit()
    await db.refresh(ev)
    return EventOut.model_validate(ev)


@router.post("/{session_id}/mail", response_model=PendingActionOut)
async def send_session_mail(session_id: str, body: SendMailRequest, db: AsyncSession = Depends(get_db)):
    await _get_session_or_404(db, session_id)
    if not smtp_mail.is_email(body.to):
        raise HTTPException(status_code=400, detail="Enter a real email address in To.")
    try:
        smtp_mail.send_mail(to=body.to, subject=body.subject, body=body.body, cc=body.cc)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    action = PendingAction(
        session_id=session_id,
        tool_name="draft_email",
        status="executed",
        confidence=1.0,
        reason="Sent from the session mail tab",
        args={
            "to": body.to.strip(),
            "cc": body.cc,
            "subject": body.subject,
            "body": body.body,
            "recipient_resolved": True,
        },
        result={"sent": True, "to": body.to.strip(), "from": get_settings().smtp_from or get_settings().smtp_user},
        decided_at=datetime.utcnow(),
    )
    db.add(action)
    await db.commit()
    await db.refresh(action)
    return PendingActionOut.model_validate(action)
