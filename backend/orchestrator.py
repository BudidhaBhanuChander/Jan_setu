"""
orchestrator.py — Grievance State Machine Orchestrator
Coordinates all 4 AI agents in sequence/parallel.
Implements the event-driven workflow described in the architecture doc.
"""
import uuid
import time
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from agents import intake_agent, routing_agent, tracking_agent, communication_agent
from database import Grievance, StatusEvent, AgentLog, Citizen, Officer, utcnow


# ─────────────────────────────────────────────
# Status Machine Transitions
# ─────────────────────────────────────────────
VALID_TRANSITIONS = {
    "NEW":        ["CLASSIFIED"],
    "CLASSIFIED": ["ASSIGNED", "CLOSED"],
    "ASSIGNED":   ["IN_PROGRESS", "RESOLVED", "ESCALATED"],
    "IN_PROGRESS":["RESOLVED", "ESCALATED"],
    "RESOLVED":   ["CLOSED", "REOPENED"],
    "CLOSED":     [],
    "ESCALATED":  ["IN_PROGRESS", "RESOLVED", "CLOSED"],
    "REOPENED":   ["CLASSIFIED", "ASSIGNED", "IN_PROGRESS"],
}

# Statuses in which an officer is actively holding the grievance against
# their workload. Used to keep Officer.current_load accurate.
_ACTIVE_LOAD_STATUSES = {"ASSIGNED", "IN_PROGRESS", "ESCALATED", "REOPENED"}


class InvalidTransition(Exception):
    """Raised when a status change violates the grievance state machine."""


def can_transition(from_status: str, to_status: str) -> bool:
    if from_status == to_status:
        return True
    return to_status in VALID_TRANSITIONS.get(from_status, [])


def _release_officer_load(db: Session, officer_id: int | None):
    """Decrement an officer's active-load counter when a grievance leaves them."""
    if not officer_id:
        return
    officer = db.query(Officer).filter(Officer.id == officer_id).first()
    if officer and officer.current_load > 0:
        officer.current_load -= 1


def _reacquire_officer_load(db: Session, officer_id: int | None):
    """Increment an officer's active-load counter when a grievance returns to them."""
    if not officer_id:
        return
    officer = db.query(Officer).filter(Officer.id == officer_id).first()
    if officer:
        officer.current_load += 1


def _make_tracking_id() -> str:
    ts = datetime.now().strftime("%Y%m%d")
    rand = uuid.uuid4().hex[:6].upper()
    return f"JS-{ts}-{rand}"


def _log_agent(db: Session, grievance_id: int, tracking_id: str, agent_name: str, result: dict):
    log = AgentLog(
        grievance_id=grievance_id,
        tracking_id=tracking_id,
        agent_name=agent_name,
        action=result.get("action", ""),
        input_summary=result.get("input_summary", ""),
        output_summary=result.get("output_summary", ""),
        confidence=result.get("confidence"),
        reasoning=result.get("reasoning", ""),
        duration_ms=result.get("duration_ms", 0),
        status="SUCCESS",
        timestamp=utcnow(),
    )
    db.add(log)


def _add_status_event(db: Session, grievance: Grievance, from_status: str, to_status: str,
                      agent_name: str, note: str, confidence: float, reasoning: str):
    event = StatusEvent(
        grievance_id=grievance.id,
        from_status=from_status,
        to_status=to_status,
        actor="AI_AGENT",
        agent_name=agent_name,
        note=note,
        ai_confidence=confidence,
        ai_reasoning=reasoning,
        timestamp=utcnow(),
    )
    db.add(event)


def process_new_grievance(raw_text: str, language: str, location_text: str,
                           ward_id: int | None, citizen_name: str,
                           citizen_phone: str, citizen_email: str,
                           channel: str, db: Session) -> Grievance:
    """
    Full pipeline: Intake → Routing → Communication (acknowledgement)
    Steps:
    1. Create skeleton Grievance
    2. Run Intake Agent → classify
    3. Run Routing Agent → assign
    4. Run Communication Agent → ack
    5. Persist everything
    """
    tracking_id = _make_tracking_id()

    # Resolve or create citizen
    citizen = None
    if citizen_phone:
        citizen = db.query(Citizen).filter(Citizen.phone == citizen_phone).first()
        if not citizen:
            citizen = Citizen(
                name=citizen_name or "Anonymous",
                phone=citizen_phone,
                email=citizen_email or "",
            )
            db.add(citizen)
            db.flush()

    # ── Step 1: Create skeleton grievance
    grievance = Grievance(
        tracking_id=tracking_id,
        citizen_id=citizen.id if citizen else None,
        raw_text=raw_text,
        channel=channel,
        language=language,
        location_text=location_text,
        ward_id=ward_id,
        status="NEW",
    )
    db.add(grievance)
    db.flush()

    # ── Step 2: Intake Agent
    intake_result = intake_agent.run(raw_text, language, db)
    grievance.category = intake_result["category"]
    grievance.sub_category = intake_result["sub_category"]
    grievance.severity = intake_result["severity"]
    grievance.sentiment = intake_result["sentiment"]
    grievance.classification_confidence = intake_result["confidence"]
    grievance.duplicate_cluster_id = intake_result.get("duplicate_cluster_id")
    grievance.extracted_entities = json.dumps(intake_result.get("extracted_entities", {}), ensure_ascii=False)

    intake_result["input_summary"] = f"Text: {raw_text[:80]}..."
    intake_result["output_summary"] = (
        f"Category={grievance.category}, Sub={grievance.sub_category}, "
        f"Severity={grievance.severity}, Sentiment={grievance.sentiment}, "
        f"Confidence={grievance.classification_confidence}"
    )

    prev_status = grievance.status
    grievance.status = "CLASSIFIED"
    _add_status_event(db, grievance, prev_status, "CLASSIFIED", "intake",
                      f"Classified as {grievance.category} / {grievance.sub_category}",
                      intake_result["confidence"], intake_result["reasoning"])
    _log_agent(db, grievance.id, tracking_id, "intake", intake_result)

    # ── Step 3: Routing Agent
    routing_result = routing_agent.run(grievance.category, grievance.severity, ward_id, db)
    grievance.department_id = routing_result["department_id"]
    grievance.assigned_officer_id = routing_result["assigned_officer_id"]
    grievance.priority = routing_result["priority"]
    grievance.sla_deadline = routing_result["sla_deadline"]
    grievance.routing_confidence = routing_result["confidence"]

    routing_result["input_summary"] = f"Category={grievance.category}, Severity={grievance.severity}"
    routing_result["output_summary"] = (
        f"Dept={routing_result['department_name']}, Officer={routing_result['assigned_officer_name']}, "
        f"SLA={routing_result['sla_hours']}h, Priority={routing_result['priority']}"
    )

    prev_status = grievance.status
    grievance.status = "ASSIGNED"
    _add_status_event(db, grievance, prev_status, "ASSIGNED", "routing",
                      f"Assigned to {routing_result['department_name']} — {routing_result['assigned_officer_name']}",
                      routing_result["confidence"], routing_result["reasoning"])
    _log_agent(db, grievance.id, tracking_id, "routing", routing_result)

    # ── Step 4: Communication Agent — send acknowledgement
    ack = communication_agent.generate_acknowledgement(
        citizen_name=citizen_name or "Citizen",
        tracking_id=tracking_id,
        category=grievance.category,
        sla_deadline=grievance.sla_deadline,
        language=language,
    )
    ack["input_summary"] = f"tracking_id={tracking_id}, language={language}"
    ack["output_summary"] = f"Acknowledgement sent via {ack['channel']}"
    _log_agent(db, grievance.id, tracking_id, "communication", ack)

    db.commit()
    db.refresh(grievance)
    return grievance


def process_resolution(grievance: Grievance, resolution_notes: str, officer_id: int, db: Session) -> dict:
    """Officer marks grievance resolved — tracking agent verifies proof."""
    verification = tracking_agent.verify_resolution_proof(grievance.raw_text, resolution_notes)

    if verification["verified"]:
        prev_status = grievance.status
        grievance.status = "RESOLVED"
        grievance.resolution_notes = resolution_notes
        grievance.resolved_at = utcnow()

        # Free the assigned officer's workload now that the case is closed out.
        if prev_status in _ACTIVE_LOAD_STATUSES:
            _release_officer_load(db, grievance.assigned_officer_id)

        _add_status_event(db, grievance, prev_status, "RESOLVED", "tracking",
                          f"Resolution verified: {resolution_notes[:80]}",
                          verification["confidence"], verification["reasoning"])

        # Communication Agent notifies citizen
        officer = (
            db.query(Officer).filter(Officer.id == grievance.assigned_officer_id).first()
            if grievance.assigned_officer_id else None
        )
        notif = communication_agent.generate_status_update(
            tracking_id=grievance.tracking_id,
            new_status="resolved",
            officer_name=officer.name if officer else "Field Officer",
            department=officer.department.name if officer and officer.department else "Department",
            sla_hours=0,
            language=grievance.language,
        )
        notif["input_summary"] = f"tracking_id={grievance.tracking_id}"
        notif["output_summary"] = "Resolution notification sent to citizen"
        _log_agent(db, grievance.id, grievance.tracking_id, "communication", notif)

        db.commit()
        return {"success": True, "verified": True, "message": "Grievance resolved and citizen notified."}
    else:
        return {
            "success": False,
            "verified": False,
            "message": f"Resolution proof verification failed ({verification['confidence']:.0%} confidence). Flagged for human review.",
            "confidence": verification["confidence"],
        }


def process_feedback(grievance: Grievance, csat_score: int, comment: str, db: Session) -> dict:
    """Process citizen feedback and potentially reopen grievance."""
    feedback = communication_agent.analyze_feedback(csat_score, comment)

    grievance.csat_score = csat_score
    grievance.feedback_comment = comment

    if feedback["should_reopen"] and grievance.status in ("RESOLVED", "CLOSED"):
        prev_status = grievance.status
        grievance.status = "REOPENED"
        # The case is active again, so it counts against the officer's load once more.
        _reacquire_officer_load(db, grievance.assigned_officer_id)
        _add_status_event(db, grievance, prev_status, "REOPENED", "communication",
                          f"Citizen reported issue unresolved (CSAT={csat_score}). Reopening.",
                          feedback["confidence"], feedback["reasoning"])
    elif grievance.status == "RESOLVED":
        grievance.status = "CLOSED"
        grievance.closed_at = utcnow()
        _add_status_event(db, grievance, "RESOLVED", "CLOSED", "communication",
                          f"Citizen satisfied (CSAT={csat_score}). Case closed.",
                          0.99, feedback["reasoning"])

    _log_agent(db, grievance.id, grievance.tracking_id, "communication", {
        **feedback,
        "input_summary": f"CSAT={csat_score}, comment='{comment[:60]}'",
        "output_summary": f"Sentiment={feedback['sentiment']}, Reopen={feedback['should_reopen']}",
    })
    db.commit()
    return feedback
