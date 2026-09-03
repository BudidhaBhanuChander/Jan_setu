"""
routers/analytics.py — Analytics & reporting endpoints for admin dashboard
"""
import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from database import get_db, Grievance, Escalation, AgentLog, Officer, Department
from models import (
    AnalyticsOverview, CategoryStat, SeverityStat, StatusStat, WardStat, TrendPoint,
    OfficerPerformance, DepartmentPerformance, PublicStats,
)
from typing import List

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


def _hours_between(created, resolved):
    """Timezone-safe resolution time in hours; returns None if incomplete."""
    if not created or not resolved:
        return None
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    if resolved.tzinfo is None:
        resolved = resolved.replace(tzinfo=timezone.utc)
    return (resolved - created).total_seconds() / 3600


@router.get("/overview", response_model=AnalyticsOverview)
def get_overview(db: Session = Depends(get_db)):
    total = db.query(Grievance).count()
    open_count = db.query(Grievance).filter(
        Grievance.status.notin_(["CLOSED", "RESOLVED"])
    ).count()
    resolved = db.query(Grievance).filter(
        Grievance.status.in_(["RESOLVED", "CLOSED"])
    ).count()
    escalated = db.query(Grievance).filter(Grievance.status == "ESCALATED").count()

    # Avg resolution time
    resolved_gs = db.query(Grievance).filter(Grievance.resolved_at.isnot(None)).all()
    if resolved_gs:
        hours = []
        for g in resolved_gs:
            created = g.created_at
            resolved_at = g.resolved_at
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if resolved_at.tzinfo is None:
                resolved_at = resolved_at.replace(tzinfo=timezone.utc)
            hours.append((resolved_at - created).total_seconds() / 3600)
        avg_hours = round(sum(hours) / len(hours), 1)
    else:
        avg_hours = 0.0

    resolution_rate = round((resolved / total * 100), 1) if total > 0 else 0.0

    # SLA breach count — distinct grievances with a level-2 (breach) escalation.
    breached = db.query(func.count(func.distinct(Escalation.grievance_id))).filter(
        Escalation.level == 2,
    ).scalar() or 0
    sla_compliance = round(((total - breached) / max(total, 1)) * 100, 1)

    return AnalyticsOverview(
        total=total,
        open=open_count,
        resolved=resolved,
        escalated=escalated,
        avg_resolution_hours=avg_hours,
        resolution_rate=resolution_rate,
        sla_breached=breached,
        sla_compliance_rate=sla_compliance,
    )


@router.get("/by-category", response_model=List[CategoryStat])
def by_category(db: Session = Depends(get_db)):
    rows = db.query(Grievance.category, func.count(Grievance.id)).group_by(Grievance.category).all()
    return [CategoryStat(category=r[0] or "Unknown", count=r[1]) for r in rows]


@router.get("/by-severity", response_model=List[SeverityStat])
def by_severity(db: Session = Depends(get_db)):
    rows = db.query(Grievance.severity, func.count(Grievance.id)).group_by(Grievance.severity).all()
    return [SeverityStat(severity=r[0] or "Unknown", count=r[1]) for r in rows]


@router.get("/by-status", response_model=List[StatusStat])
def by_status(db: Session = Depends(get_db)):
    rows = db.query(Grievance.status, func.count(Grievance.id)).group_by(Grievance.status).all()
    return [StatusStat(status=r[0], count=r[1]) for r in rows]


@router.get("/by-ward", response_model=List[WardStat])
def by_ward(db: Session = Depends(get_db)):
    rows = db.query(Grievance.location_text, func.count(Grievance.id)).group_by(Grievance.location_text).all()
    result = [WardStat(ward=r[0] or "Unknown", count=r[1]) for r in rows if r[0]]
    return sorted(result, key=lambda x: x.count, reverse=True)[:10]


@router.get("/trend", response_model=List[TrendPoint])
def trend(days: int = 7, db: Session = Depends(get_db)):
    points = []
    now = datetime.now(timezone.utc)
    for i in range(days - 1, -1, -1):
        day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0)
        day_end = (now - timedelta(days=i)).replace(hour=23, minute=59, second=59)
        submitted = db.query(Grievance).filter(
            Grievance.created_at >= day_start,
            Grievance.created_at <= day_end,
        ).count()
        resolved = db.query(Grievance).filter(
            Grievance.resolved_at >= day_start,
            Grievance.resolved_at <= day_end,
        ).count()
        points.append(TrendPoint(
            date=(now - timedelta(days=i)).strftime("%d %b"),
            submitted=submitted,
            resolved=resolved,
        ))
    return points


@router.get("/officer-performance", response_model=List[OfficerPerformance])
def officer_performance(db: Session = Depends(get_db)):
    """Per-officer workload and resolution scorecard."""
    officers = db.query(Officer).all()
    result = []
    for o in officers:
        gs = db.query(Grievance).filter(Grievance.assigned_officer_id == o.id).all()
        total = len(gs)
        resolved_gs = [g for g in gs if g.status in ("RESOLVED", "CLOSED")]
        escalated = sum(1 for g in gs if g.status == "ESCALATED")

        res_hours = [h for h in (_hours_between(g.created_at, g.resolved_at) for g in resolved_gs) if h is not None]
        avg_res = round(sum(res_hours) / len(res_hours), 1) if res_hours else 0.0

        csats = [g.csat_score for g in gs if g.csat_score]
        avg_csat = round(sum(csats) / len(csats), 2) if csats else 0.0

        result.append(OfficerPerformance(
            officer_id=o.id,
            name=o.name,
            department=o.department.name if o.department else "Unassigned",
            role=o.role,
            current_load=o.current_load,
            total_assigned=total,
            resolved=len(resolved_gs),
            escalated=escalated,
            avg_resolution_hours=avg_res,
            avg_csat=avg_csat,
            resolution_rate=round((len(resolved_gs) / total * 100), 1) if total else 0.0,
        ))
    # Best performers first: highest resolution rate, then most resolved.
    return sorted(result, key=lambda r: (r.resolution_rate, r.resolved), reverse=True)


@router.get("/by-department", response_model=List[DepartmentPerformance])
def by_department(db: Session = Depends(get_db)):
    """Per-department performance scorecard."""
    depts = db.query(Department).all()
    result = []
    for d in depts:
        gs = db.query(Grievance).filter(Grievance.department_id == d.id).all()
        total = len(gs)
        resolved_gs = [g for g in gs if g.status in ("RESOLVED", "CLOSED")]
        escalated = sum(1 for g in gs if g.status == "ESCALATED")
        open_count = total - len(resolved_gs)

        res_hours = [h for h in (_hours_between(g.created_at, g.resolved_at) for g in resolved_gs) if h is not None]
        avg_res = round(sum(res_hours) / len(res_hours), 1) if res_hours else 0.0

        # SLA breaches = distinct grievances in this dept with a level-2 escalation.
        breached = db.query(func.count(func.distinct(Escalation.grievance_id))).join(
            Grievance, Grievance.id == Escalation.grievance_id
        ).filter(Grievance.department_id == d.id, Escalation.level == 2).scalar() or 0
        compliance = round(((total - breached) / max(total, 1)) * 100, 1)

        officer_count = db.query(func.count(Officer.id)).filter(Officer.department_id == d.id).scalar() or 0

        result.append(DepartmentPerformance(
            department_id=d.id,
            department=d.name,
            code=d.code,
            total=total,
            resolved=len(resolved_gs),
            open=open_count,
            escalated=escalated,
            avg_resolution_hours=avg_res,
            sla_compliance_rate=compliance,
            officer_count=officer_count,
        ))
    return sorted(result, key=lambda r: r.total, reverse=True)


@router.get("/public-stats", response_model=PublicStats)
def public_stats(db: Session = Depends(get_db)):
    """Lightweight, non-sensitive stats suitable for a citizen-facing banner."""
    total = db.query(Grievance).count()
    resolved = db.query(Grievance).filter(Grievance.status.in_(["RESOLVED", "CLOSED"])).count()
    resolved_gs = db.query(Grievance).filter(Grievance.resolved_at.isnot(None)).all()
    res_hours = [h for h in (_hours_between(g.created_at, g.resolved_at) for g in resolved_gs) if h is not None]
    avg_res = round(sum(res_hours) / len(res_hours), 1) if res_hours else 0.0
    breached = db.query(func.count(func.distinct(Escalation.grievance_id))).filter(
        Escalation.level == 2
    ).scalar() or 0
    return PublicStats(
        total_grievances=total,
        resolved=resolved,
        resolution_rate=round((resolved / total * 100), 1) if total else 0.0,
        avg_resolution_hours=avg_res,
        sla_compliance_rate=round(((total - breached) / max(total, 1)) * 100, 1),
        departments=db.query(func.count(Department.id)).scalar() or 0,
        active_officers=db.query(func.count(Officer.id)).filter(Officer.is_active == True).scalar() or 0,
    )


@router.get("/export.csv")
def export_csv(
    status: str = None,
    category: str = None,
    department_id: int = None,
    db: Session = Depends(get_db),
):
    """Stream all matching grievances as a CSV download for offline reporting."""
    query = db.query(Grievance)
    if status:
        query = query.filter(Grievance.status == status)
    if category:
        query = query.filter(Grievance.category == category)
    if department_id:
        query = query.filter(Grievance.department_id == department_id)
    rows = query.order_by(Grievance.created_at.desc()).all()

    # Pre-resolve department & officer names to avoid per-row lazy lookups.
    dept_names = {d.id: d.name for d in db.query(Department).all()}
    officer_names = {o.id: o.name for o in db.query(Officer).all()}

    def iter_csv():
        buf = io.StringIO()
        writer = csv.writer(buf)
        header = [
            "tracking_id", "created_at", "category", "sub_category", "severity",
            "sentiment", "status", "priority", "department", "assigned_officer",
            "location", "sla_deadline", "resolved_at", "csat_score",
            "classification_confidence", "routing_confidence",
        ]
        writer.writerow(header)
        yield buf.getvalue(); buf.seek(0); buf.truncate(0)
        for g in rows:
            writer.writerow([
                g.tracking_id,
                g.created_at.isoformat() if g.created_at else "",
                g.category, g.sub_category, g.severity, g.sentiment, g.status, g.priority,
                dept_names.get(g.department_id, ""),
                officer_names.get(g.assigned_officer_id, ""),
                g.location_text,
                g.sla_deadline.isoformat() if g.sla_deadline else "",
                g.resolved_at.isoformat() if g.resolved_at else "",
                g.csat_score if g.csat_score is not None else "",
                g.classification_confidence, g.routing_confidence,
            ])
            yield buf.getvalue(); buf.seek(0); buf.truncate(0)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M")
    return StreamingResponse(
        iter_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="jansetu_grievances_{ts}.csv"'},
    )


@router.get("/agent-logs")
def agent_logs(limit: int = 100, agent_name: str = None, db: Session = Depends(get_db)):
    q = db.query(AgentLog)
    if agent_name:
        q = q.filter(AgentLog.agent_name == agent_name)
    logs = q.order_by(AgentLog.timestamp.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "grievance_id": l.grievance_id,
            "tracking_id": l.tracking_id,
            "agent_name": l.agent_name,
            "action": l.action,
            "input_summary": l.input_summary,
            "output_summary": l.output_summary,
            "confidence": l.confidence,
            "reasoning": l.reasoning,
            "duration_ms": l.duration_ms,
            "status": l.status,
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
        }
        for l in logs
    ]
