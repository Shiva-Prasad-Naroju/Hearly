from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def gen_id() -> str:
    return uuid.uuid4().hex


def now() -> datetime:
    return datetime.utcnow()


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    title: Mapped[str] = mapped_column(String, default="Untitled session")
    status: Mapped[str] = mapped_column(String, default="created")  # created|live|processing|complete
    consent_acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    running_summary: Mapped[str] = mapped_column(Text, default="")
    state: Mapped[dict] = mapped_column(JSON, default=dict)  # open_items snapshot etc
    last_processed_index: Mapped[int] = mapped_column(Integer, default=0)  # watermark into segments

    report: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # final synthesized report

    participants: Mapped[list["Participant"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    segments: Mapped[list["TranscriptSegment"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    events: Mapped[list["Event"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    alerts: Mapped[list["Alert"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    pending_actions: Mapped[list["PendingAction"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"))
    speaker_label: Mapped[str] = mapped_column(String)  # "speaker_1"
    display_name: Mapped[str | None] = mapped_column(String, nullable=True)
    name_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    name_source: Mapped[str] = mapped_column(String, default="none")  # user|inferred|none
    total_speech_ms: Mapped[int] = mapped_column(Integer, default=0)

    session: Mapped[Session] = relationship(back_populates="participants")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"))
    sequence: Mapped[int] = mapped_column(Integer)
    speaker_label: Mapped[str] = mapped_column(String)
    text: Mapped[str] = mapped_column(Text)
    start_ms: Mapped[int] = mapped_column(Integer, default=0)
    end_ms: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    session: Mapped[Session] = relationship(back_populates="segments")


class Event(Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"))
    type: Mapped[str] = mapped_column(String)  # decision|action_item|commitment|deadline|question|follow_up|risk|important_event|email_request|person_mention
    summary: Mapped[str] = mapped_column(Text)
    owner_speaker_label: Mapped[str | None] = mapped_column(String, nullable=True)
    owner_name: Mapped[str | None] = mapped_column(String, nullable=True)
    due_text: Mapped[str | None] = mapped_column(String, nullable=True)
    modality: Mapped[str] = mapped_column(String, default="stated")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String, default="open")  # open|done|cancelled|superseded
    dedupe_key: Mapped[str] = mapped_column(String, index=True)
    evidence_quote: Mapped[str] = mapped_column(Text, default="")
    evidence_segment_ids: Mapped[list] = mapped_column(JSON, default=list)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    session: Mapped[Session] = relationship(back_populates="events")


class Alert(Base):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"))
    event_id: Mapped[str | None] = mapped_column(ForeignKey("events.id"), nullable=True)
    level: Mapped[str] = mapped_column(String)  # INFO|LOW|MEDIUM|HIGH|CRITICAL
    title: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    session: Mapped[Session] = relationship(back_populates="alerts")


class PendingAction(Base):
    __tablename__ = "pending_actions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_id)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"))
    tool_name: Mapped[str] = mapped_column(String, default="draft_email")
    status: Mapped[str] = mapped_column(String, default="pending")  # pending|approved|rejected|executed
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reason: Mapped[str] = mapped_column(Text, default="")
    args: Mapped[dict] = mapped_column(JSON, default=dict)  # to, cc, subject, body, recipient_resolved
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    session: Mapped[Session] = relationship(back_populates="pending_actions")
