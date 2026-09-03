import uuid
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import Grievance, User, StatusEvent, AgentLog
from agents.graph import grievance_graph

def utcnow():
    return datetime.now(timezone.utc)

def _make_tracking_id():
    return f"JS-{utcnow().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

def _add_status_event(db, grievance, from_status, to_status, actor, note, ai_confidence=None, ai_reasoning=""):
    event = StatusEvent(
        grievance_id=grievance.id,
        from_status=from_status,
        to_status=to_status,
        actor=actor,
        note=note,
        ai_confidence=ai_confidence,
        ai_reasoning=ai_reasoning
    )
    db.add(event)

def process_new_grievance(raw_text: str, language: str, location_text: str,
                           ward_id: int | None, citizen_name: str, citizen_phone: str,
                           citizen_email: str, channel: str, db: Session, citizen_user_id: int = None,
                           latitude: float = None, longitude: float = None, geohash: str = "",
                           before_image_url: str = "", image_path: str = "") -> Grievance:
    
    tracking_id = _make_tracking_id()
    
    if not citizen_user_id and citizen_phone:
        citizen = db.query(User).filter(User.username == citizen_phone).first()
        if citizen:
            citizen_user_id = citizen.id

    img_url = before_image_url or image_path or ""
            
    # Initialize LangGraph State
    initial_state = {
        "raw_text": raw_text,
        "language": language,
        "channel": channel,
        "location_text": location_text,
        "ward_id": ward_id,
        "has_image": bool(img_url),
        "citizen_id": citizen_user_id,
        "db_session": db,
        "agent_logs": []
    }
    
    # Run LangGraph Workflow
    print("Starting LangGraph workflow...")
    final_state = grievance_graph.invoke(initial_state)
    print("LangGraph workflow complete.")
    
    # Check for early exits (spam or errors)
    if final_state.get("is_spam"):
        grievance = Grievance(
            tracking_id=tracking_id,
            citizen_id=citizen_user_id,
            raw_text=raw_text,
            channel=channel,
            language=language,
            location_text=location_text,
            ward_id=ward_id,
            latitude=latitude,
            longitude=longitude,
            geohash=geohash or "",
            before_image_url=img_url,
            image_path=img_url,
            has_image=bool(img_url),
            status="REJECTED_SPAM",
        )
        db.add(grievance)
        db.commit()
        return grievance
    
    # Create Grievance from State
    grievance = Grievance(
        tracking_id=tracking_id,
        citizen_id=citizen_user_id,
        raw_text=raw_text,
        channel=channel,
        language=language,
        location_text=location_text,
        latitude=latitude,
        longitude=longitude,
        geohash=geohash or "",
        before_image_url=img_url,
        image_path=img_url,
        has_image=bool(img_url),
        ward_id=ward_id,
        status="ASSIGNED" if final_state.get("assigned_officer_id") else "NEW",
        
        category=final_state.get("category", ""),
        sub_category=final_state.get("sub_category", ""),
        severity=final_state.get("severity", "MEDIUM"),
        sentiment=final_state.get("sentiment", "NEUTRAL"),
        duplicate_cluster_id=final_state.get("duplicate_cluster_id"),
        
        department_id=final_state.get("department_id"),
        assigned_officer_id=final_state.get("assigned_officer_id"),
        priority=final_state.get("priority", 3),
        priority_score=final_state.get("priority_score", 50.0),
        priority_reason=final_state.get("priority_reason", ""),
    )
    
    # Parse SLA deadline
    sla_str = final_state.get("sla_deadline")
    if sla_str:
        try:
            grievance.sla_deadline = datetime.fromisoformat(sla_str.replace("Z", "+00:00"))
        except:
            pass
            
    db.add(grievance)
    db.flush()
    
    _add_status_event(db, grievance, "NEW", grievance.status, "LangGraph", f"Assigned to {grievance.assigned_officer_name or 'Field Officer'}")
    db.commit()
    db.refresh(grievance)
    return grievance

def process_resolution(grievance: Grievance, resolution_notes: str, officer_id: int, db: Session, resolution_image: str = "") -> dict:
    """Processes resolution submission by officer with AI verification gatekeeping."""
    from agents.communication_agent import generate_status_update
    from agents.verification_agent import verify_resolution

    # 1. Run AI Quality & Resolution Verification Gate
    verif = verify_resolution(
        category=grievance.category or "General",
        original_complaint=grievance.raw_text or "",
        resolution_notes=resolution_notes,
        resolution_image=resolution_image,
        citizen_image=grievance.image_path or ""
    )

    if not verif.get("is_valid"):
        # Autonomous AI gatekeeper rejects invalid/unverified resolution
        _add_status_event(
            db=db,
            grievance=grievance,
            from_status=grievance.status,
            to_status=grievance.status,
            actor="AI_AGENT",
            note=f"AI Resolution Verification Failed ({verif.get('verification_status')}): {verif.get('reasoning')}",
            ai_confidence=verif.get("confidence", 0.3),
            ai_reasoning=verif.get("reasoning", "")
        )
        db.commit()
        return {
            "success": False,
            "verification_rejected": True,
            "confidence": verif.get("confidence", 0.3),
            "reasoning": verif.get("reasoning", "Resolution notes too vague or lacking operational proof."),
            "message": f"AI Verification Rejected: {verif.get('reasoning')}"
        }

    prev_status = grievance.status
    grievance.status = "RESOLVED"
    grievance.resolution_notes = resolution_notes
    if resolution_image:
        grievance.resolution_image = resolution_image
    grievance.resolved_at = utcnow()
    
    # Audit log status event with AI verification score
    _add_status_event(
        db=db,
        grievance=grievance,
        from_status=prev_status,
        to_status="RESOLVED",
        actor="OFFICER",
        note=f"Resolution Verified by AI ({int(verif.get('confidence', 0.8)*100)}% Confidence): {resolution_notes}",
        ai_confidence=verif.get("confidence", 0.85),
        ai_reasoning=verif.get("reasoning", "Operational actions verified")
    )

    # Release officer workload
    if grievance.assigned_officer_id:
        off = db.query(User).filter(User.id == grievance.assigned_officer_id).first()
        if off and off.current_load > 0:
            off.current_load -= 1

    # Communication Agent notification
    comm_msg = generate_status_update(
        tracking_id=grievance.tracking_id,
        new_status="RESOLVED",
        officer_name=grievance.assigned_officer_name or "Assigned Officer",
        department=grievance.department_name or "GHMC Department",
        language=grievance.language or "en",
        citizen_name="Citizen"
    )

    db.commit()
    db.refresh(grievance)
    return {
        "success": True, 
        "verification": verif,
        "message": f"Grievance resolution verified and approved by AI Quality Gate ({int(verif.get('confidence', 0.8)*100)}% Confidence)",
        "notification": comm_msg.get("message", "")
    }

def process_feedback(grievance: Grievance, csat_score: int, comment: str, db: Session) -> dict:
    """Processes citizen CSAT feedback, reopening or closing ticket based on satisfaction."""
    from agents.communication_agent import analyze_csat
    grievance.csat_score = csat_score
    grievance.feedback_comment = comment or ""
    
    csat_analysis = analyze_csat(csat_score, comment)

    if csat_analysis.get("should_reopen"):
        # Re-open and escalate ticket
        prev_status = grievance.status
        grievance.status = "REOPENED"
        grievance.escalation_level = (grievance.escalation_level or 0) + 1
        _add_status_event(
            db=db,
            grievance=grievance,
            from_status=prev_status,
            to_status="REOPENED",
            actor="CITIZEN",
            note=f"Citizen Dissatisfied (CSAT: {csat_score}/5). Reopened and escalated to supervisor. Comment: {comment}"
        )
        db.commit()
        return {
            "should_reopen": True, 
            "message": "Grievance reopened and escalated due to low satisfaction score.",
            "response": csat_analysis.get("response", "")
        }
    else:
        # Close ticket
        prev_status = grievance.status
        grievance.status = "CLOSED"
        grievance.closed_at = utcnow()
        _add_status_event(
            db=db,
            grievance=grievance,
            from_status=prev_status,
            to_status="CLOSED",
            actor="CITIZEN",
            note=f"Citizen Feedback Received (CSAT: {csat_score}/5). Grievance formally closed."
        )
        db.commit()
        return {
            "should_reopen": False, 
            "message": "Feedback submitted and grievance closed.",
            "response": csat_analysis.get("response", "")
        }

def process_dispute(grievance: Grievance, dispute_reason: str, dispute_image_url: str, db: Session) -> dict:
    """
    Handles citizen contestation of false/negligent officer resolution.
    Re-opens ticket to DISPUTED, escalates to Level 2 (Zonal Commissioner),
    and records an official negligence strike against the officer.
    """
    prev_status = grievance.status
    grievance.status = "DISPUTED"
    grievance.dispute_reason = dispute_reason
    grievance.dispute_image_url = dispute_image_url or ""
    grievance.disputed_at = utcnow()
    grievance.escalation_level = 2  # Directly elevate to Zonal Commissioner (L2)

    # Apply strike / disciplinary flag to the assigned officer
    if grievance.assigned_officer_id:
        officer = db.query(User).filter(User.id == grievance.assigned_officer_id).first()
        if officer:
            officer.negligence_strikes = (officer.negligence_strikes or 0) + 1
            officer_name = officer.name
        else:
            officer_name = "Officer"
    else:
        officer_name = "Officer"

    # Log Dispute StatusEvent
    _add_status_event(
        db=db,
        grievance=grievance,
        from_status=prev_status,
        to_status="DISPUTED",
        actor="CITIZEN",
        note=f"Resolution Disputed by Citizen: '{dispute_reason}'. Negligence strike logged against {officer_name}. Escalated to Zonal Commissioner."
    )

    db.commit()
    db.refresh(grievance)
    return {
        "success": True,
        "status": "DISPUTED",
        "message": "Grievance marked as DISPUTED. An officer negligence audit incident has been initiated with the Zonal Commissioner."
    }

def can_transition(prev: str, current: str) -> bool:
    VALID_TRANSITIONS = {
        "NEW": ["CLASSIFIED", "ASSIGNED", "REJECTED_SPAM"],
        "CLASSIFIED": ["ASSIGNED", "IN_PROGRESS", "TEAM_DISPATCHED"],
        "ASSIGNED": ["TEAM_DISPATCHED", "ON_SITE_INSPECTION", "WORK_IN_PROGRESS", "IN_PROGRESS", "RESOLVED", "ESCALATED"],
        "TEAM_DISPATCHED": ["ON_SITE_INSPECTION", "WORK_IN_PROGRESS", "RESOLVED", "ESCALATED"],
        "ON_SITE_INSPECTION": ["WORK_IN_PROGRESS", "RESOLVED", "ESCALATED"],
        "WORK_IN_PROGRESS": ["RESOLVED", "ESCALATED"],
        "IN_PROGRESS": ["RESOLVED", "ESCALATED", "ASSIGNED"],
        "RESOLVED": ["CLOSED", "REOPENED", "DISPUTED", "ESCALATED"],
        "DISPUTED": ["ASSIGNED", "IN_PROGRESS", "WORK_IN_PROGRESS", "RESOLVED"],
        "ESCALATED": ["IN_PROGRESS", "WORK_IN_PROGRESS", "RESOLVED"],
        "REOPENED": ["ASSIGNED", "IN_PROGRESS", "WORK_IN_PROGRESS", "RESOLVED"],
        "CLOSED": ["REOPENED", "DISPUTED"]
    }
    return current in VALID_TRANSITIONS.get(prev, [current])

_ACTIVE_LOAD_STATUSES = [
    "ASSIGNED", "TEAM_DISPATCHED", "ON_SITE_INSPECTION", 
    "WORK_IN_PROGRESS", "IN_PROGRESS", "REOPENED", "ESCALATED", "DISPUTED"
]

def _release_officer_load(db: Session, officer_id: int):
    if officer_id:
        off = db.query(User).filter(User.id == officer_id).first()
        if off and off.current_load > 0:
            off.current_load -= 1
            db.commit()

def _reacquire_officer_load(db: Session, officer_id: int):
    if officer_id:
        off = db.query(User).filter(User.id == officer_id).first()
        if off:
            off.current_load += 1
            db.commit()

