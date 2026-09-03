"""
scheduler.py — Autonomous background SLA monitor.

Runs the tracking agent's escalation check on a fixed interval so SLA
breaches are caught and escalated without anyone pressing a button. This is
what turns the tracking agent from a request-triggered helper into a genuinely
*autonomous* agent — a core part of the multi-agent story.

Implemented with a plain asyncio task (no external scheduler dependency) so the
app stays lightweight and runnable offline. Enable via SLA_SCHEDULER_ENABLED.
"""
import asyncio
from datetime import datetime, timezone

from config import settings

# Module-level state so /api/admin/config can report scheduler health.
_state = {
    "enabled": False,
    "running": False,
    "interval_minutes": settings.SLA_CHECK_INTERVAL_MINUTES,
    "last_run_at": None,
    "last_actions": 0,
    "total_runs": 0,
}
_task: "asyncio.Task | None" = None


def get_state() -> dict:
    """Snapshot of scheduler status for admin/health endpoints."""
    return dict(_state)


def _run_once() -> int:
    """Run a single escalation sweep in its own DB session. Returns action count."""
    from database import SessionLocal
    from agents.tracking_agent import run_escalation_check

    db = SessionLocal()
    try:
        actions = run_escalation_check(db)
        return len(actions)
    finally:
        db.close()


async def _loop(interval_seconds: float):
    _state["running"] = True
    try:
        while True:
            try:
                # run_escalation_check is synchronous/blocking; keep the event
                # loop responsive by running it in a worker thread.
                count = await asyncio.to_thread(_run_once)
                _state["last_run_at"] = datetime.now(timezone.utc).isoformat()
                _state["last_actions"] = count
                _state["total_runs"] += 1
                print(f"[SLA Scheduler] Sweep complete — {count} escalation action(s).")
            except Exception as exc:  # never let a bad sweep kill the loop
                print(f"[SLA Scheduler] Sweep failed: {exc}")
            await asyncio.sleep(interval_seconds)
    except asyncio.CancelledError:
        pass
    finally:
        _state["running"] = False


def start() -> None:
    """Start the background loop if enabled in config. Safe to call once at startup."""
    global _task
    _state["enabled"] = settings.SLA_SCHEDULER_ENABLED
    _state["interval_minutes"] = settings.SLA_CHECK_INTERVAL_MINUTES
    if not settings.SLA_SCHEDULER_ENABLED:
        print("[SLA Scheduler] Disabled (set SLA_SCHEDULER_ENABLED=true to enable).")
        return
    if _task and not _task.done():
        return
    interval = max(0.5, settings.SLA_CHECK_INTERVAL_MINUTES) * 60
    _task = asyncio.create_task(_loop(interval))
    print(f"[SLA Scheduler] Started — checking every {settings.SLA_CHECK_INTERVAL_MINUTES} min.")


async def stop() -> None:
    """Cancel the background loop cleanly on shutdown."""
    global _task
    if _task and not _task.done():
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass
    _task = None
