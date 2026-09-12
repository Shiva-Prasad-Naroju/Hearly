from __future__ import annotations

import logging
import re
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Session, Participant, Event, Alert, PendingAction
from app.schemas import StatePatch, ExtractedEvent, MailComposeResult

logger = logging.getLogger("hearly.state")

CONFIDENCE_FLOOR = 0.55  # below this, the event is stored but never surfaced as an alert/action

# Only these spoken shapes count as a mail promise. "send this to the mail" does not.
MAIL_PROMISE = re.compile(
    r"""(?ix)
    (?:
        \b(?:i|we|he|she|they)\b.{0,40}(?:'ll|will|am\s+going\s+to|are\s+going\s+to|gonna).{0,30}
        (?:mail|e-?mail|send\b.{0,20}\b(?:mail|e-?mail))
        |
        \bplease\b.{0,24}\b(?:mail|e-?mail|send\b.{0,20}\b(?:mail|e-?mail))
        |
        \b(?:mail|e-?mail)\s+me\b
        |
        \bsend\s+(?:you|me|them|him|her|us)\s+(?:a|an|the)?\s*(?:mail|e-?mail)
    )
    """
)

ALERT_LEVEL_BY_TYPE = {
    "risk": "HIGH",
    "important_event": "HIGH",
    "deadline": "MEDIUM",
    "decision": "LOW",
    "commitment": "LOW",
    "email_request": "MEDIUM",
    "action_item": "INFO",
    "follow_up": "INFO",
    "question": "INFO",
    "person_mention": None,
}


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())


def quote_is_grounded(quote: str, window_text: str) -> bool:
    """Evidence-grounding check: the quote must actually appear in the window we sent.
    A quote that isn't in the window is treated as a hallucination and the event is dropped."""
    if not quote:
        return False
    q = _normalize(quote)
    w = _normalize(window_text)
    if q in w:
        return True
    # allow minor punctuation/whitespace drift: compare with punctuation stripped too
    q2 = re.sub(r"[^\w\s]", "", q)
    w2 = re.sub(r"[^\w\s]", "", w)
    return q2 in w2


def compute_dedupe_key(ev: ExtractedEvent) -> str:
    owner = (ev.owner_speaker_label or "none").lower()
    summary_words = re.sub(r"[^\w\s]", "", ev.summary.lower()).split()[:6]
    return f"{ev.type}:{owner}:{'-'.join(summary_words)}"


def alert_level_for(ev: ExtractedEvent) -> str | None:
    if ev.confidence < CONFIDENCE_FLOOR:
        return None
    return ALERT_LEVEL_BY_TYPE.get(ev.type)


async def _get_or_create_participant(db: AsyncSession, session_id: str, speaker_label: str) -> Participant:
    result = await db.execute(
        select(Participant).where(Participant.session_id == session_id, Participant.speaker_label == speaker_label)
    )
    p = result.scalar_one_or_none()
    if p is None:
        p = Participant(session_id=session_id, speaker_label=speaker_label)
        db.add(p)
        await db.flush()
    return p


async def apply_patch(
    db: AsyncSession, session: Session, patch: StatePatch, window_text: str
) -> tuple[list[Event], list[Alert], list[PendingAction]]:
    new_events: list[Event] = []
    new_alerts: list[Alert] = []
    new_actions: list[PendingAction] = []

    # 1. Evidence-gated speaker name binding
    for claim in patch.speaker_name_claims:
        if not quote_is_grounded(claim.evidence_quote, window_text):
            logger.info("dropping ungrounded name claim: %s -> %s", claim.speaker_label, claim.name)
            continue
        if claim.confidence < 0.6:
            continue
        participant = await _get_or_create_participant(db, session.id, claim.speaker_label)
        # Only upgrade, never overwrite a higher-confidence existing binding with a lower one
        if claim.confidence >= participant.name_confidence:
            participant.display_name = claim.name
            participant.name_confidence = claim.confidence
            participant.name_source = "inferred"

    # 2. Events
    for ev in patch.events:
        if not quote_is_grounded(ev.evidence.quote, window_text):
            logger.info("dropping ungrounded event (hallucinated evidence): %s", ev.summary)
            continue

        # Names may only be attached if already bound on a participant with real evidence
        owner_name = None
        if ev.owner_speaker_label:
            await _get_or_create_participant(db, session.id, ev.owner_speaker_label)
            result = await db.execute(
                select(Participant).where(
                    Participant.session_id == session.id, Participant.speaker_label == ev.owner_speaker_label
                )
            )
            participant = result.scalar_one_or_none()
            if participant and participant.display_name and participant.name_confidence >= 0.6:
                owner_name = participant.display_name
        elif ev.owner_name:
            # LLM gave a bare name with no speaker binding evidence in THIS window; don't trust it standalone
            owner_name = None

        dedupe_key = compute_dedupe_key(ev)
        result = await db.execute(
            select(Event).where(Event.session_id == session.id, Event.dedupe_key == dedupe_key)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.last_seen_at = datetime.utcnow()
            existing.confidence = max(existing.confidence, ev.confidence)
            existing.evidence_segment_ids = existing.evidence_segment_ids or []
            db.add(existing)
            continue  # already surfaced once; don't re-alert or re-draft

        event_row = Event(
            session_id=session.id,
            type=ev.type,
            summary=ev.summary,
            owner_speaker_label=ev.owner_speaker_label,
            owner_name=owner_name,
            due_text=ev.due_text,
            modality=ev.modality,
            confidence=ev.confidence,
            dedupe_key=dedupe_key,
            evidence_quote=ev.evidence.quote,
            evidence_segment_ids=[],
        )
        db.add(event_row)
        await db.flush()
        new_events.append(event_row)

        level = alert_level_for(ev)
        if level:
            alert_row = Alert(
                session_id=session.id,
                event_id=event_row.id,
                level=level,
                title=event_row.summary,
                body=f"{ev.type.replace('_', ' ').title()} — {ev.due_text or ''}".strip(" —"),
            )
            db.add(alert_row)
            await db.flush()
            new_alerts.append(alert_row)

        # Mail drafts are composed after the session is summarized — never from a live window.

    # 4. Running summary
    if patch.summary_update:
        session.running_summary = patch.summary_update
        db.add(session)

    await db.commit()
    return new_events, new_alerts, new_actions


def has_explicit_mail_promise(transcript_text: str) -> bool:
    """True only when someone actually promised or asked to send an email."""
    return bool(MAIL_PROMISE.search(transcript_text or ""))


def _pretty_speaker(label: str | None) -> str | None:
    if not label:
        return None
    m = re.match(r"speaker[_\s-]?(\d+)$", label.strip(), re.I)
    if m:
        return f"Speaker {m.group(1)}"
    return label.replace("_", " ").strip().title()


def _looks_like_transcript_dump(text: str, transcript_text: str) -> bool:
    """True if the draft copied spoken fragments instead of summarizing."""
    blob = (text or "").strip()
    if not blob:
        return True
    source = (transcript_text or "").strip()
    if not source:
        return False
    for line in source.splitlines():
        spoken = re.sub(r"^[^:]+:\s*", "", line).strip()
        if len(spoken) >= 18 and spoken.lower() in blob.lower():
            return True
    return False


def _summary_followup_body(summary: str, reason: str) -> str:
    topic = (summary or "").strip() or "our conversation"
    lines = ["Hi,", "", "Following up from our conversation.", ""]
    if reason:
        lines.append(reason)
        lines.append("")
    lines.append(topic)
    lines.extend(["", "Thanks"])
    return "\n".join(lines)


def _sanitize_to(to: str, transcript_text: str) -> str:
    value = (to or "").strip()
    if not value:
        return ""
    if "@" in value and value.lower() not in (transcript_text or "").lower():
        return ""
    return value


async def seed_composed_mails(
    db: AsyncSession,
    session: Session,
    composed: MailComposeResult,
    summary: str,
    transcript_text: str = "",
) -> list[PendingAction]:
    """Persist polished follow-ups after the session report exists. Never paste raw speech."""
    existing = (
        await db.execute(
            select(PendingAction).where(
                PendingAction.session_id == session.id,
                PendingAction.tool_name == "draft_email",
                PendingAction.status == "pending",
            )
        )
    ).scalars().all()
    if existing:
        return []

    created: list[PendingAction] = []
    seen_reasons: set[str] = set()

    for mail in composed.mails:
        subject = (mail.subject or "").strip()
        body = (mail.body or "").strip()
        reason = (mail.reason or "").strip()
        if not subject or not body:
            continue
        if _looks_like_transcript_dump(f"{subject}\n{body}", transcript_text):
            body = _summary_followup_body(summary, reason)
            first = (summary.split(".")[0] if summary else "Follow-up").strip()
            subject = first[:80] if first else "Follow-up from our conversation"
        if not reason:
            who = mail.speaker_name or _pretty_speaker(mail.speaker_label) or "Someone"
            reason = f"{who} said they would send a mail about this conversation."
        if reason.lower() in seen_reasons:
            continue
        seen_reasons.add(reason.lower())

        action = PendingAction(
            session_id=session.id,
            tool_name="draft_email",
            status="pending",
            confidence=0.9,
            reason=reason,
            args={
                "to": _sanitize_to(mail.to, transcript_text),
                "cc": [],
                "subject": subject,
                "body": body,
                "recipient_resolved": False,
            },
        )
        db.add(action)
        created.append(action)

    if created:
        await db.commit()
        for action in created:
            await db.refresh(action)
    return created
