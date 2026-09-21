# Hearly

**Ambient conversation intelligence.** Press Start, talk, and Hearly turns the conversation into a
speaker-labelled transcript plus structured decisions, action items, deadlines and email drafts —
all reviewed by you before anything leaves the system.

Hackathon MVP stack: **React + Vite** frontend, **FastAPI + SQLite** backend, **Groq** (Whisper for
speech-to-text, Llama 3.3 for extraction) and **Sarvam Bulbul** for text-to-speech.

## 1. Add your API keys-

Edit `.env` in the repo root and fill in the two values:

```
GROQ_API_KEY=your_groq_key
SARVAM_API_KEY=your_sarvam_key
```

Get a free Groq key at https://console.groq.com/keys and a Sarvam key at https://dashboard.sarvam.ai/.

## 2. Run the backend-

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate      # macOS/Linux
pip install -r ../requirements.txt
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

Check it booted and your keys are picked up: open http://localhost:8001/healthz — it should report
`groq_configured: true` and `sarvam_configured: true`.

## 3. Run the frontend-

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, allow microphone access, and press **Start Listening**.

## How it works-

```
Browser mic → 4s self-contained audio clips → POST /api/sessions/{id}/audio-chunk
    → Groq Whisper (speech-to-text)
    → transcript segment stored + shown live
    → every few turns: a cheap regex gate decides whether there's anything worth
      asking an LLM about, then Groq Llama 3.3 extracts decisions / action items /
      commitments / deadlines / risks / email requests as structured JSON
    → every extracted fact must quote verbatim text from the window it came from,
      or it's discarded as a hallucination
    → alerts + email drafts surface immediately; email drafts always require your
      explicit approval before you'd ever send them (Hearly never sends email itself)
    → Stop → Groq synthesizes the end-of-session report
    → optional: ask a question about the conversation, get a spoken answer via Sarvam TTS
```

### Why speakers are tagged by tapping, not fully automatic-

Real-time automatic speaker diarization needs a dedicated streaming ASR vendor with
built-in diarization (see the architecture plan for the full comparison). For this
hackathon build we use Groq's Whisper API, which is excellent and very fast but doesn't
diarize. Instead, tap the speaker chip for whoever is about to talk — it's fast, it's
honest about what it's doing, and the transcript still comes out speaker-labelled.

### What's deliberately not built yet-

No real email sending (drafts only, copy-to-clipboard), no cross-session memory, no
calendar/task integrations, no accounts/auth (single implicit user). See
`docs/` (if present) or the original architecture plan for the full phased roadmap.
