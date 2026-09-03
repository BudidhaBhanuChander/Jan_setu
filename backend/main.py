"""
main.py — FastAPI application entry point for Jan Setu AI Grievance Redressal System
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from database import init_db
from routers import grievances, officers, departments, analytics, voice, admin, auth
import scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler.start()          # autonomous SLA monitor (no-op unless enabled)
    try:
        yield
    finally:
        await scheduler.stop()


app = FastAPI(
    title="Jan Setu — AI Grievance Redressal System V2",
    description=(
        "Enterprise Multi-agent AI system for municipal grievance redressal modelled on GHMC. "
        "Powered by 4 cooperative AI agents: Intake & Classification, Routing & Assignment, "
        "Resolution Tracking & Escalation, and Citizen Communication."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# CORS. Note: the "*" wildcard cannot be combined with credentials, so we only
# enable credentials when an explicit origin list is configured.
_allow_all = settings.CORS_ORIGINS == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=not _allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(grievances.router)
app.include_router(officers.router)
app.include_router(departments.router)
app.include_router(analytics.router)
app.include_router(voice.router)
app.include_router(admin.router)


@app.get("/")
def root():
    return {
        "system": "Jan Setu — AI Grievance Redressal System",
        "version": "1.2.0",
        "agents": ["intake", "routing", "tracking", "communication"],
        "llm_mode": settings.LLM_PROVIDER if settings.llm_enabled else "simulation",
        "voice_enabled": settings.voice_enabled,
        "sla_scheduler_enabled": settings.SLA_SCHEDULER_ENABLED,
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "llm_enabled": settings.llm_enabled,
        "voice_enabled": settings.voice_enabled,
    }
