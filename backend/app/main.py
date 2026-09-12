from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.routers import sessions, audio, actions, tts

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Hearly API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list or ["*"],
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(audio.router)
app.include_router(actions.router)
app.include_router(tts.router)


@app.get("/healthz")
async def healthz():
    live = get_settings()
    return {
        "status": "ok",
        "groq_configured": bool(live.groq_api_key),
        "sarvam_configured": bool(live.sarvam_api_key),
        "smtp_configured": bool(live.smtp_host and live.smtp_user and live.smtp_password),
    }
