"""
routers/admin.py — Admin utilities: runtime config/health and demo reset.

These endpoints power the admin "system health" panel and let a presenter
reset the demo database to a clean, well-populated state between runs.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from config import settings
from database import get_db, Grievance, Officer, Department, Citizen
import scheduler

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/config")
def get_config(db: Session = Depends(get_db)):
    """Non-sensitive runtime configuration + live counts for a health panel.

    Deliberately never returns API keys — only whether a capability is on.
    """
    return {
        "version": "1.2.0",
        "llm": {
            "enabled": settings.llm_enabled,
            "provider": settings.LLM_PROVIDER if settings.llm_enabled else "simulation",
            "model": settings.LLM_MODEL or "(provider default)" if settings.llm_enabled else None,
        },
        "voice": {
            "enabled": settings.voice_enabled,
            "stt_model": settings.STT_MODEL,
            "tts_model": settings.TTS_MODEL,
        },
        "sla_scheduler": scheduler.get_state(),
        "admin_reset_allowed": settings.ALLOW_ADMIN_RESET,
        "counts": {
            "grievances": db.query(func.count(Grievance.id)).scalar() or 0,
            "officers": db.query(func.count(Officer.id)).scalar() or 0,
            "departments": db.query(func.count(Department.id)).scalar() or 0,
            "citizens": db.query(func.count(Citizen.id)).scalar() or 0,
        },
    }


@router.post("/sla/run-now")
def run_sla_now(db: Session = Depends(get_db)):
    """Manually trigger one escalation sweep (same routine the scheduler runs)."""
    from agents.tracking_agent import run_escalation_check
    actions = run_escalation_check(db)
    return {"actions_taken": len(actions), "details": actions}


@router.post("/reset")
def reset_database():
    """Wipe and re-seed the demo database. Guarded by ALLOW_ADMIN_RESET.

    Intended for demos/presentations only — returns the fresh counts so the UI
    can confirm the reset succeeded.
    """
    if not settings.ALLOW_ADMIN_RESET:
        raise HTTPException(
            status_code=403,
            detail="Admin reset is disabled. Set ALLOW_ADMIN_RESET=true to enable.",
        )
    # Imported lazily so a normal server start never needs the seed module.
    from seed_data import seed
    from database import SessionLocal

    seed()

    db = SessionLocal()
    try:
        counts = {
            "grievances": db.query(func.count(Grievance.id)).scalar() or 0,
            "officers": db.query(func.count(Officer.id)).scalar() or 0,
            "departments": db.query(func.count(Department.id)).scalar() or 0,
            "citizens": db.query(func.count(Citizen.id)).scalar() or 0,
        }
    finally:
        db.close()
    return {"success": True, "message": "Database reset and re-seeded.", "counts": counts}
