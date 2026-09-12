from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field

# ---------- API request/response models ----------

class CreateSessionRequest(BaseModel):
    title: str = "Untitled session"


class ParticipantOut(BaseModel):
    speaker_label: str
    display_name: str | None = None
    name_confidence: float = 0.0
    name_source: str = "none"

    model_config = {"from_attributes": True}


class SegmentOut(BaseModel):
    id: str
    sequence: int
    speaker_label: str
    text: str
    start_ms: int
    end_ms: int
    confidence: float

    model_config = {"from_attributes": True}


class EventOut(BaseModel):
    id: str
    type: str
    summary: str
    owner_speaker_label: str | None
    owner_name: str | None
    due_text: str | None
    modality: str
    confidence: float
    status: str
    evidence_quote: str

    model_config = {"from_attributes": True}


class AlertOut(BaseModel):
    id: str
    level: str
    title: str
    body: str

    model_config = {"from_attributes": True}


class PendingActionOut(BaseModel):
    id: str
    tool_name: str
    status: str
    confidence: float
    reason: str
    args: dict
    result: dict | None = None

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    id: str
    title: str
    status: str
    started_at: str | None = None
    ended_at: str | None = None
    running_summary: str = ""
    report: dict | None = None

    model_config = {"from_attributes": True}


class AudioChunkResponse(BaseModel):
    segments: list[SegmentOut]
    events: list[EventOut]
    alerts: list[AlertOut]
    pending_actions: list[PendingActionOut]
    participants: list[ParticipantOut]
    running_summary: str
    extraction_ran: bool


class RenameParticipantRequest(BaseModel):
    display_name: str


class ApproveActionRequest(BaseModel):
    edited_args: dict | None = None


class SendMailRequest(BaseModel):
    to: str
    cc: list[str] = Field(default_factory=list)
    subject: str
    body: str


class UpdateEventRequest(BaseModel):
    status: Literal["open", "done", "cancelled"]


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    citations: list[str] = Field(default_factory=list)


class TtsRequest(BaseModel):
    text: str
    language_code: str | None = None
    speaker: str | None = None


class TtsResponse(BaseModel):
    audio_base64: str
    format: str = "wav"


# ---------- LLM structured-output schemas (extraction) ----------

class Evidence(BaseModel):
    quote: str
    speaker_label: str


class EmailDraftFields(BaseModel):
    to: str
    cc: list[str] = Field(default_factory=list)
    subject: str
    body: str


class ExtractedEvent(BaseModel):
    type: Literal[
        "decision", "action_item", "commitment", "deadline", "question",
        "follow_up", "risk", "important_event", "email_request", "person_mention",
    ]
    summary: str
    owner_speaker_label: Optional[str] = None
    owner_name: Optional[str] = None
    due_text: Optional[str] = None
    modality: Literal["stated", "hypothetical", "quoted", "negated", "questioned"] = "stated"
    confidence: float = 0.5
    evidence: Evidence
    email_draft: Optional[EmailDraftFields] = None


class SpeakerNameClaim(BaseModel):
    speaker_label: str
    name: str
    confidence: float
    evidence_quote: str


class StatePatch(BaseModel):
    events: list[ExtractedEvent] = Field(default_factory=list)
    summary_update: str = ""
    speaker_name_claims: list[SpeakerNameClaim] = Field(default_factory=list)
    nothing_notable: bool = False


class SessionReport(BaseModel):
    summary: str
    decisions: list[str] = Field(default_factory=list)
    action_items: list[str] = Field(default_factory=list)
    deadlines: list[str] = Field(default_factory=list)
    follow_ups: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)
    participants: list[str] = Field(default_factory=list)


class ComposedMail(BaseModel):
    speaker_label: str | None = None
    speaker_name: str | None = None
    reason: str
    to: str = ""
    subject: str
    body: str


class MailComposeResult(BaseModel):
    mails: list[ComposedMail] = Field(default_factory=list)


class SessionDetailOut(SessionOut):
    participants: list[ParticipantOut] = Field(default_factory=list)
    segments: list[SegmentOut] = Field(default_factory=list)
    events: list[EventOut] = Field(default_factory=list)
    alerts: list[AlertOut] = Field(default_factory=list)
    pending_actions: list[PendingActionOut] = Field(default_factory=list)


class StartSessionRequest(BaseModel):
    consent_acknowledged: bool = False
