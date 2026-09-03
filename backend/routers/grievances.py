"""
routers/grievances.py — Full CRUD + AI pipeline endpoints for grievances
"""
from fastapi import APIRouter, Depends, HTTPException, Response, status as http_status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
import json

from database import get_db, Grievance, StatusEvent
from models import (
    GrievanceCreate, GrievanceOut, GrievanceUpdate, FeedbackCreate,
    PaginatedGrievances,
)
from orchestrator import (
    process_new_grievance, process_resolution, process_feedback,
    can_transition, _release_officer_load, _reacquire_officer_load,
    _ACTIVE_LOAD_STATUSES,
)
from agents.tracking_agent import check_sla_status

router = APIRouter(prefix="/api/grievances", tags=["Grievances"])

# Columns the client is allowed to sort by (maps public name → ORM column).
_SORTABLE = {
    "created_at": Grievance.created_at,
    "updated_at": Grievance.updated_at,
    "priority": Grievance.priority,
    "severity": Grievance.severity,
    "status": Grievance.status,
    "sla_deadline": Grievance.sla_deadline,
}


def _apply_filters(query, status, category, severity, department_id, officer_id, q):
    if status:
        query = query.filter(Grievance.status == status)
    if category:
        query = query.filter(Grievance.category == category)
    if severity:
        query = query.filter(Grievance.severity == severity)
    if department_id:
        query = query.filter(Grievance.department_id == department_id)
    if officer_id:
        query = query.filter(Grievance.assigned_officer_id == officer_id)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter(or_(
            Grievance.raw_text.ilike(like),
            Grievance.tracking_id.ilike(like),
            Grievance.location_text.ilike(like),
            Grievance.category.ilike(like),
        ))
    return query


@router.post("/", response_model=GrievanceOut)
def submit_grievance(payload: GrievanceCreate, db: Session = Depends(get_db)):
    """Submit a new grievance — triggers the full AI agent pipeline."""
    grievance = process_new_grievance(
        raw_text=payload.raw_text,
        language=payload.language or "en",
        location_text=payload.location_text or "",
        ward_id=None,
        citizen_name=payload.citizen_name or "Anonymous",
        citizen_phone=payload.citizen_phone or "",
        citizen_email=payload.citizen_email or "",
        channel=payload.channel or "WEB",
        db=db,
    )
    return grievance


@router.get("/", response_model=List[GrievanceOut])
def list_grievances(
    response: Response,
    status: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    department_id: Optional[int] = None,
    officer_id: Optional[int] = None,
    q: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List grievances with optional filters, free-text search and sorting.

    The total match count (ignoring pagination) is returned in the
    ``X-Total-Count`` response header so simple list clients can page.
    """
    query = _apply_filters(
        db.query(Grievance), status, category, severity, department_id, officer_id, q
    )
    total = query.count()

    sort_col = _SORTABLE.get(sort_by, Grievance.created_at)
    sort_col = sort_col.asc() if order.lower() == "asc" else sort_col.desc()

    response.headers["X-Total-Count"] = str(total)
    return query.order_by(sort_col).offset(skip).limit(limit).all()


@router.get("/search", response_model=PaginatedGrievances)
def search_grievances(
    status: Optional[str] = None,
    category: Optional[str] = None,
    severity: Optional[str] = None,
    department_id: Optional[int] = None,
    officer_id: Optional[int] = None,
    q: Optional[str] = None,
    sort_by: str = "created_at",
    order: str = "desc",
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
):
    """Paginated search returning a ``{total, skip, limit, items}`` envelope."""
    query = _apply_filters(
        db.query(Grievance), status, category, severity, department_id, officer_id, q
    )
    total = query.count()
    sort_col = _SORTABLE.get(sort_by, Grievance.created_at)
    sort_col = sort_col.asc() if order.lower() == "asc" else sort_col.desc()
    items = query.order_by(sort_col).offset(skip).limit(limit).all()
    return PaginatedGrievances(total=total, skip=skip, limit=limit, items=items)



@router.get("/{tracking_id}", response_model=GrievanceOut)
def get_grievance(tracking_id: str, db: Session = Depends(get_db)):
    g = db.query(Grievance).filter(Grievance.tracking_id == tracking_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    return g


@router.patch("/{tracking_id}/status")
def update_status(tracking_id: str, payload: GrievanceUpdate, db: Session = Depends(get_db)):
    g = db.query(Grievance).filter(Grievance.tracking_id == tracking_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")

    if payload.status == "RESOLVED" and payload.resolution_notes:
        result = process_resolution(g, payload.resolution_notes, officer_id=0, db=db)
        return result
    elif payload.status:
        from database import utcnow
        prev = g.status
        if not can_transition(prev, payload.status):
            raise HTTPException(
                status_code=409,
                detail=f"Invalid status transition: {prev} → {payload.status}",
            )

        # Keep officer workload accurate as the case moves through its lifecycle.
        was_active = prev in _ACTIVE_LOAD_STATUSES
        now_active = payload.status in _ACTIVE_LOAD_STATUSES
        if was_active and not now_active:
            _release_officer_load(db, g.assigned_officer_id)
        elif now_active and not was_active:
            _reacquire_officer_load(db, g.assigned_officer_id)

        g.status = payload.status
        if payload.status == "CLOSED" and not g.closed_at:
            g.closed_at = utcnow()

        event = StatusEvent(
            grievance_id=g.id,
            from_status=prev,
            to_status=payload.status,
            actor="OFFICER",
            agent_name="",
            note=payload.resolution_notes or f"Status updated to {payload.status}",
            timestamp=utcnow(),
        )
        db.add(event)
        db.commit()
        return {"success": True, "status": payload.status}

    return {"success": False, "message": "No valid update provided"}


@router.post("/{tracking_id}/feedback")
def submit_feedback(tracking_id: str, payload: FeedbackCreate, db: Session = Depends(get_db)):
    g = db.query(Grievance).filter(Grievance.tracking_id == tracking_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    if payload.csat_score < 1 or payload.csat_score > 5:
        raise HTTPException(status_code=400, detail="CSAT score must be 1-5")
    result = process_feedback(g, payload.csat_score, payload.comment or "", db)
    return result


@router.get("/{tracking_id}/sla")
def get_sla_status(tracking_id: str, db: Session = Depends(get_db)):
    g = db.query(Grievance).filter(Grievance.tracking_id == tracking_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Grievance not found")
    return check_sla_status(g)


@router.post("/sla/check-all")
def run_sla_check(db: Session = Depends(get_db)):
    """Trigger the tracking agent's full SLA check — returns escalation actions taken."""
    from agents.tracking_agent import run_escalation_check
    actions = run_escalation_check(db)
    return {"actions_taken": len(actions), "details": actions}
