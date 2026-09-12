from __future__ import annotations

import asyncio
import json
import logging

from groq import Groq
from pydantic import ValidationError

from app.config import get_settings
from app.schemas import StatePatch, SessionReport, AskResponse

logger = logging.getLogger("hearly.llm")

_client: Groq | None = None


def _get_client() -> Groq:
    global _client
    settings = get_settings()
    if _client is None:
        if not settings.groq_api_key:
            raise RuntimeError("GROQ_API_KEY is not set. Add it to your .env file.")
        _client = Groq(api_key=settings.groq_api_key)
    return _client


EXTRACTION_SYSTEM_PROMPT = """You are the conversation-intelligence engine inside Hearly, an ambient \
meeting assistant. You read a short window of a live, speaker-labelled transcript and extract only what \
is genuinely notable, as a single JSON object.

Event taxonomy: decision, action_item, commitment, deadline, question, follow_up, risk, \
important_event, email_request, person_mention.

Critical distinctions (get these right, they are the whole job):
- "I'll send the report tomorrow" -> commitment, modality=stated, owner=the speaker.
- "I could send the report" / "We might do X" -> modality=hypothetical. Still record it, but never as a firm commitment.
- "He said he'd handle it" -> modality=quoted, owner is NOT the current speaker.
- "I'm not going to send that" -> modality=negated.
- "Should we deploy Friday?" -> type=question, modality=questioned. Not a decision.
- Casual banter, backchannel ("yeah", "okay", "cool") -> emit nothing for it.
- A name mentioned with no clear evidence of that person owning an action -> type=person_mention only,
  never bind it as an owner_name on another event.

Hard rules:
1. NEVER invent a name. Only set owner_name when the transcript window itself provides direct evidence
   (the person was addressed by name, or self-identified). Otherwise leave owner_name null and use
   owner_speaker_label only.
2. NEVER invent an email address or resolve "the client"/"Rahul" to an address. Email drafts always use
   the human-readable recipient text as spoken, never a fabricated address.
3. Every event MUST include an evidence.quote that is copied VERBATIM (exact substring) from the window
   you were given. Do not paraphrase the quote. If you cannot quote it verbatim, do not emit the event.
4. If the window has nothing notable, return "nothing_notable": true and empty "events".
5. Only emit an "email_draft" on an event of type "email_request" or a commitment that explicitly is
   about sending something, and only when the conversation gave you enough to draft it.
6. Output confidence honestly: 0.9+ only for explicit, unambiguous statements.

Respond with ONLY a single JSON object matching this exact shape (no markdown fences, no commentary):
{
  "events": [
    {
      "type": "commitment",
      "summary": "short imperative phrase, <=140 chars",
      "owner_speaker_label": "speaker_2",
      "owner_name": null,
      "due_text": "tomorrow",
      "modality": "stated",
      "confidence": 0.92,
      "evidence": {"quote": "exact verbatim span from the window", "speaker_label": "speaker_2"},
      "email_draft": null
    }
  ],
  "summary_update": "new running summary of the WHOLE conversation so far, <=200 words",
  "speaker_name_claims": [
    {"speaker_label": "speaker_2", "name": "Rahul", "confidence": 0.8, "evidence_quote": "exact verbatim span"}
  ],
  "nothing_notable": false
}
"""

FINALIZE_SYSTEM_PROMPT = """You are writing the end-of-session report for Hearly. You are given the \
full speaker-labelled transcript, the running summary, and any extracted events. Produce a clean, \
human-useful report from the transcript. Respond with ONLY a single JSON object of this exact shape, \
no markdown fences:
{
  "summary": "2-4 sentence overview of what was said",
  "decisions": ["..."],
  "action_items": ["Owner -> what they will do"],
  "deadlines": ["What -> when"],
  "follow_ups": ["..."],
  "open_questions": ["..."],
  "participants": ["Speaker 1", "Rahul (Speaker 2)"]
}
Keep every line short and concrete. Do not invent anything not present in the transcript or events.
If the transcript has content, the summary MUST describe it — never say that no summary is available.
"""

QA_SYSTEM_PROMPT = """You answer a user's question about their own conversation, using ONLY the transcript, \
running summary and events provided. If the answer isn't in the given context, say you don't have enough \
information yet. Respond with ONLY a JSON object: {"answer": "...", "citations": ["short quote or event summary", ...]}
"""


def _strip_code_fences(content: str) -> str:
    content = content.strip()
    if content.startswith("```"):
        content = content.split("```", 2)
        content = content[1] if len(content) > 1 else content[0]
        if content.lstrip().startswith("json"):
            content = content.lstrip()[4:]
    return content.strip()


def _chat_json_sync(system: str, user: str, retry_note: str | None = None) -> dict:
    client = _get_client()
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user if not retry_note else f"{user}\n\n[Previous attempt was invalid: {retry_note}. Fix it.]"},
    ]
    completion = client.chat.completions.create(
        model=get_settings().groq_llm_model,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.15,
        max_tokens=2000,
    )
    content = completion.choices[0].message.content or "{}"
    return json.loads(_strip_code_fences(content))


async def _chat_json(system: str, user: str) -> dict:
    return await asyncio.to_thread(_chat_json_sync, system, user)


async def extract_window(state_card: str, window_text: str) -> StatePatch | None:
    user_prompt = f"CURRENT STATE:\n{state_card}\n\nNEW TRANSCRIPT WINDOW (extract only from this):\n{window_text}"
    try:
        raw = await _chat_json(EXTRACTION_SYSTEM_PROMPT, user_prompt)
        return StatePatch.model_validate(raw)
    except (ValidationError, json.JSONDecodeError) as e:
        logger.warning("extraction validation failed, retrying once: %s", e)
        try:
            raw = await asyncio.to_thread(_chat_json_sync, EXTRACTION_SYSTEM_PROMPT, user_prompt, str(e)[:300])
            return StatePatch.model_validate(raw)
        except Exception as e2:
            logger.error("extraction failed twice, skipping window: %s", e2)
            return None
    except Exception as e:
        logger.error("extraction call failed: %s", e)
        return None


async def finalize_session(
    running_summary: str,
    events_text: str,
    participants_text: str,
    transcript_text: str = "",
) -> SessionReport | None:
    user_prompt = (
        f"TRANSCRIPT:\n{transcript_text or '(no transcript captured)'}\n\n"
        f"RUNNING SUMMARY:\n{running_summary}\n\n"
        f"PARTICIPANTS:\n{participants_text}\n\n"
        f"EVENTS:\n{events_text}"
    )
    try:
        raw = await _chat_json(FINALIZE_SYSTEM_PROMPT, user_prompt)
        return SessionReport.model_validate(raw)
    except Exception as e:
        logger.error("finalize failed: %s", e)
        return None


async def answer_question(
    question: str, running_summary: str, events_text: str, transcript_text: str = ""
) -> AskResponse:
    user_prompt = (
        f"TRANSCRIPT:\n{transcript_text or '(no transcript)'}\n\n"
        f"RUNNING SUMMARY:\n{running_summary}\n\nEVENTS:\n{events_text}\n\nQUESTION: {question}"
    )
    try:
        raw = await _chat_json(QA_SYSTEM_PROMPT, user_prompt)
        return AskResponse.model_validate(raw)
    except Exception as e:
        logger.error("qa failed: %s", e)
        return AskResponse(answer="I couldn't process that right now.", citations=[])
