"""
agents/priority_engine.py — Multi-Factor Dynamic Priority & SLA Computation Engine

Priority is computed dynamically across 3 autonomous factors:
1. AI Hazard & Impact Assessment (30-50 pts)
2. Local Area Density & Cluster Surge Multiplier (+10 to +30 pts)
3. Sensitive Infrastructure & Landmark Zone Boost (+10 to +20 pts)

Final Composite Score (0-100 pts) determines:
- Level 1: CRITICAL (Score >= 75) -> 4 Hours SLA
- Level 2: HIGH (Score >= 50)     -> 24 Hours SLA
- Level 3: NORMAL (Score >= 30)   -> 48 Hours SLA
- Level 4: LOW (Score < 30)       -> 96 Hours SLA
"""
import re
from datetime import datetime, timezone, timedelta
from sqlalchemy import or_, func

SENSITIVE_LANDMARKS = [
    "hospital", "clinic", "dispensary", "gandhi hospital", "osmania", "nims",
    "school", "college", "university", "vidyalaya", "kindergarten",
    "metro station", "bus stop", "railway station", "airport", "flyover", "junction", "crossroad",
    "main road", "highway", "water tank", "reservoir", "electric substation", "transformer"
]

HIGH_HAZARD_KEYWORDS = [
    "sparking", "live wire", "electrocution", "short circuit", "burst", "rupture",
    "contamination", "cholera", "poisonous", "foul smell", "sewage overflow",
    "accident", "open manhole", "deep ditch", "cave in", "sinkhole", "danger",
    "flooding", "waterlogged", "hospital", "children", "elderly", "blocked ambulance"
]

SEVERITY_BASE_SCORES = {
    "CRITICAL": 50.0,
    "HIGH": 38.0,
    "MEDIUM": 25.0,
    "LOW": 12.0
}

def calculate_composite_priority(
    raw_text: str,
    category: str,
    ai_severity: str,
    location_text: str,
    ward_id: int | None,
    db
) -> dict:
    from database import Grievance
    score = 0.0
    reason_parts = []

    base_score = SEVERITY_BASE_SCORES.get((ai_severity or "MEDIUM").upper(), 25.0)
    score += base_score
    reason_parts.append(f"AI Base Severity ({(ai_severity or 'MEDIUM').upper()}): +{int(base_score)}pts")

    text_lower = (raw_text or "").lower()
    matched_hazards = [kw for kw in HIGH_HAZARD_KEYWORDS if kw in text_lower]
    if matched_hazards:
        hazard_boost = min(len(matched_hazards) * 8.0, 20.0)
        score += hazard_boost
        reason_parts.append(f"Hazard Multiplier ({', '.join(matched_hazards[:3])}): +{int(hazard_boost)}pts")

    cluster_count = 0
    if location_text and len(location_text.strip()) > 3:
        loc_words = [w.strip() for w in re.split(r'[, -]', location_text) if len(w.strip()) > 3]
        if loc_words:
            seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
            query = db.query(Grievance).filter(
                Grievance.status.in_(["NEW", "ASSIGNED", "IN_PROGRESS", "ESCALATED"]),
                Grievance.created_at >= seven_days_ago
            )
            filters = [Grievance.location_text.ilike(f"%{lw}%") for lw in loc_words[:2]]
            if ward_id:
                filters.append(Grievance.ward_id == ward_id)
            query = query.filter(or_(*filters))
            cluster_count = query.count()

    if cluster_count >= 5:
        density_boost = 30.0
        score += density_boost
        reason_parts.append(f"Critical Area Cluster (5+ active issues in area): +{int(density_boost)}pts")
    elif cluster_count >= 3:
        density_boost = 20.0
        score += density_boost
        reason_parts.append(f"High Area Density ({cluster_count} active complaints in area): +{int(density_boost)}pts")
    elif cluster_count >= 1:
        density_boost = 10.0
        score += density_boost
        reason_parts.append(f"Area Recurrence ({cluster_count} active nearby reports): +{int(density_boost)}pts")

    search_context = f"{raw_text} {location_text}".lower()
    matched_landmarks = [lm for lm in SENSITIVE_LANDMARKS if lm in search_context]
    if matched_landmarks:
        zone_boost = 15.0
        score += zone_boost
        reason_parts.append(f"Sensitive Zone ({matched_landmarks[0].title()} Proximity): +{int(zone_boost)}pts")

    final_score = min(max(score, 5.0), 100.0)

    if final_score >= 75.0:
        priority_level = 1
        computed_severity = "CRITICAL"
        sla_hours = 4
    elif final_score >= 50.0:
        priority_level = 2
        computed_severity = "HIGH"
        sla_hours = 24
    elif final_score >= 30.0:
        priority_level = 3
        computed_severity = "MEDIUM"
        sla_hours = 48
    else:
        priority_level = 4
        computed_severity = "LOW"
        sla_hours = 96

    now = datetime.now(timezone.utc)
    sla_deadline = now + timedelta(hours=sla_hours)
    priority_reason = " | ".join(reason_parts) + f" -> Final Composite Score: {int(final_score)}/100 (Priority Level {priority_level})"

    return {
        "priority": priority_level,
        "priority_score": round(final_score, 1),
        "priority_reason": priority_reason,
        "computed_severity": computed_severity,
        "sla_hours": sla_hours,
        "sla_deadline": sla_deadline,
        "cluster_count": cluster_count
    }

def apply_field_inspection_adjustment(
    grievance,
    new_severity: str,
    inspection_notes: str,
    officer_id: int,
    db
) -> dict:
    from database import StatusEvent, utcnow
    prev_priority = grievance.priority
    prev_severity = grievance.severity
    sev_upper = new_severity.upper()
    if sev_upper == "CRITICAL":
        new_priority = 1
        sla_hours = 4
    elif sev_upper == "HIGH":
        new_priority = 2
        sla_hours = 24
    elif sev_upper == "LOW":
        new_priority = 4
        sla_hours = 96
    else:
        new_priority = 3
        sla_hours = 48

    now = utcnow()
    new_sla_deadline = now + timedelta(hours=sla_hours)
    grievance.severity = sev_upper
    grievance.priority = new_priority
    grievance.sla_deadline = new_sla_deadline
    grievance.field_inspection_notes = inspection_notes
    grievance.field_inspected_at = now
    grievance.field_inspected_by = officer_id
    grievance.priority_reason = f"Ground Field Inspection by Officer #{officer_id}: Adjusted to {sev_upper} (Priority {new_priority}). Notes: {inspection_notes}"

    audit_note = f"Field Inspection: Priority changed from Level {prev_priority} ({prev_severity}) to Level {new_priority} ({sev_upper}). SLA reset to {sla_hours}h. Findings: {inspection_notes}"
    event = StatusEvent(
        grievance_id=grievance.id,
        from_status=grievance.status,
        to_status=grievance.status,
        actor="OFFICER",
        agent_name="FieldInspectionModule",
        note=audit_note,
        timestamp=now
    )
    db.add(event)
    db.commit()
    db.refresh(grievance)

    return {
        "success": True,
        "tracking_id": grievance.tracking_id,
        "new_priority": new_priority,
        "new_severity": sev_upper,
        "sla_hours": sla_hours,
        "sla_deadline": new_sla_deadline.isoformat(),
        "audit_note": audit_note
    }
