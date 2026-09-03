from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from config import settings
from database import get_db, Grievance, User, Department, Zone, AgentLog
from auth import get_password_hash, get_current_user
import scheduler

router = APIRouter(prefix="/api/admin", tags=["Admin"])

# Schemas
class DepartmentCreate(BaseModel):
    name: str
    code: str
    description: Optional[str] = ""

class OfficerCreate(BaseModel):
    name: str
    username: str
    password: str
    role: str = "OFFICER_L1"  # OFFICER_L1 or COMMISSIONER_L2
    department_id: Optional[int] = None
    zone_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class OfficerUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    zone_id: Optional[int] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

# ─────────────────────────────────────────────
# Overview & Metrics
# ─────────────────────────────────────────────
@router.get("/overview")
def get_admin_overview(db: Session = Depends(get_db)):
    total_citizens = db.query(func.count(User.id)).filter(User.role == 'CITIZEN').scalar() or 0
    total_officers = db.query(func.count(User.id)).filter(User.role.in_(['OFFICER_L1', 'COMMISSIONER_L2'])).scalar() or 0
    total_departments = db.query(func.count(Department.id)).scalar() or 0
    total_grievances = db.query(func.count(Grievance.id)).scalar() or 0
    resolved_grievances = db.query(func.count(Grievance.id)).filter(Grievance.status.in_(['RESOLVED', 'CLOSED'])).scalar() or 0
    escalated_grievances = db.query(func.count(Grievance.id)).filter(Grievance.status == 'ESCALATED').scalar() or 0
    
    # Recent agent activity logs
    recent_logs = db.query(AgentLog).order_by(AgentLog.timestamp.desc()).limit(10).all()

    return {
        "metrics": {
            "citizens": total_citizens,
            "officers": total_officers,
            "departments": total_departments,
            "grievances": total_grievances,
            "resolved": resolved_grievances,
            "escalated": escalated_grievances,
            "resolution_rate": round((resolved_grievances / total_grievances * 100), 1) if total_grievances > 0 else 0
        },
        "system": {
            "llm_provider": settings.LLM_PROVIDER,
            "llm_model": settings.LLM_MODEL,
            "voice_enabled": settings.voice_enabled,
            "watchdog_state": scheduler.get_state()
        },
        "recent_logs": [
            {
                "id": l.id,
                "agent_name": l.agent_name,
                "action": l.action,
                "tracking_id": l.tracking_id,
                "status": l.status,
                "confidence": l.confidence,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None
            }
            for l in recent_logs
        ]
    }

# ─────────────────────────────────────────────
# Department Management
# ─────────────────────────────────────────────
@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).all()
    results = []
    for d in depts:
        officer_count = db.query(func.count(User.id)).filter(User.department_id == d.id).scalar() or 0
        active_tickets = db.query(func.count(Grievance.id)).filter(
            Grievance.department_id == d.id,
            Grievance.status.notin_(['RESOLVED', 'CLOSED'])
        ).scalar() or 0
        results.append({
            "id": d.id,
            "name": d.name,
            "code": d.code,
            "description": d.description,
            "officer_count": officer_count,
            "active_tickets": active_tickets
        })
    return results

@router.post("/departments")
def create_department(dept: DepartmentCreate, db: Session = Depends(get_db)):
    existing = db.query(Department).filter(
        (Department.name == dept.name) | (Department.code == dept.code)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department name or code already exists")
    
    new_dept = Department(
        name=dept.name,
        code=dept.code.upper(),
        description=dept.description or ""
    )
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return {"success": True, "department": {"id": new_dept.id, "name": new_dept.name, "code": new_dept.code}}

# ─────────────────────────────────────────────
# Officer & Staff Management
# ─────────────────────────────────────────────
@router.get("/officers")
def list_officers(db: Session = Depends(get_db)):
    officers = db.query(User).filter(User.role.in_(['OFFICER_L1', 'COMMISSIONER_L2', 'ADMIN'])).all()
    results = []
    for off in officers:
        dept_name = off.department.name if off.department else "Unassigned"
        active_tasks = db.query(func.count(Grievance.id)).filter(
            Grievance.assigned_officer_id == off.id,
            Grievance.status.notin_(['RESOLVED', 'CLOSED'])
        ).scalar() or 0
        resolved_tasks = db.query(func.count(Grievance.id)).filter(
            Grievance.assigned_officer_id == off.id,
            Grievance.status.in_(['RESOLVED', 'CLOSED'])
        ).scalar() or 0
        
        results.append({
            "id": off.id,
            "name": off.name,
            "username": off.username,
            "role": off.role,
            "phone": off.phone,
            "email": off.email,
            "department_id": off.department_id,
            "department_name": dept_name,
            "zone_id": off.zone_id,
            "is_active": getattr(off, 'is_active', True),
            "negligence_strikes": getattr(off, 'negligence_strikes', 0) or 0,
            "current_load": active_tasks,
            "resolved_tasks": resolved_tasks,
            "created_at": off.created_at.isoformat() if off.created_at else None
        })
    return results

@router.post("/officers")
def create_officer(officer: OfficerCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == officer.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_pwd = get_password_hash(officer.password)
    new_officer = User(
        name=officer.name,
        username=officer.username,
        hashed_password=hashed_pwd,
        role=officer.role,
        department_id=officer.department_id,
        zone_id=officer.zone_id,
        phone=officer.phone,
        email=officer.email,
        is_active=True
    )
    db.add(new_officer)
    db.commit()
    db.refresh(new_officer)
    return {
        "success": True, 
        "officer": {
            "id": new_officer.id, 
            "name": new_officer.name, 
            "username": new_officer.username, 
            "role": new_officer.role
        }
    }

@router.patch("/officers/{officer_id}")
def update_officer(officer_id: int, data: OfficerUpdate, db: Session = Depends(get_db)):
    officer = db.query(User).filter(User.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    
    if data.name is not None:
        officer.name = data.name
    if data.department_id is not None:
        officer.department_id = data.department_id
    if data.zone_id is not None:
        officer.zone_id = data.zone_id
    if data.phone is not None:
        officer.phone = data.phone
    if data.email is not None:
        officer.email = data.email
    if data.role is not None:
        officer.role = data.role
    if data.is_active is not None:
        officer.is_active = data.is_active
        
    db.commit()
    db.refresh(officer)
    return {"success": True, "message": "Officer updated successfully"}

@router.delete("/officers/{officer_id}")
def delete_officer(officer_id: int, db: Session = Depends(get_db)):
    officer = db.query(User).filter(User.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")
    
    officer.is_active = False
    db.commit()
    return {"success": True, "message": "Officer deactivated successfully"}

@router.post("/sla/run-now")
def run_sla_now(db: Session = Depends(get_db)):
    from agents.tracking_agent import run_escalation_check
    actions = run_escalation_check(db)
    return {"actions_taken": len(actions), "details": actions}


@router.get("/gis/blackspots")
def get_gis_blackspots(db: Session = Depends(get_db)):
    """
    Analyzes spatial coordinates & ward occurrences of open tickets across Hyderabad
    to identify chronic civic failure blackspots.
    """
    from collections import defaultdict
    
    # Pre-defined known Hyderabad municipal coordinates for landmark mapping
    HYDERABAD_GEO_COORDS = {
        "Charminar": {"lat": 17.3616, "lng": 78.4747, "zone": "Charminar"},
        "Santoshnagar": {"lat": 17.3489, "lng": 78.5034, "zone": "Charminar"},
        "Chandrayangutta": {"lat": 17.3188, "lng": 78.4735, "zone": "Charminar"},
        "Khairatabad": {"lat": 17.4123, "lng": 78.4593, "zone": "Khairatabad"},
        "Banjara Hills": {"lat": 17.4156, "lng": 78.4347, "zone": "Khairatabad"},
        "Jubilee Hills": {"lat": 17.4319, "lng": 78.4073, "zone": "Khairatabad"},
        "Secunderabad": {"lat": 17.4399, "lng": 78.4983, "zone": "Secunderabad"},
        "Begumpet": {"lat": 17.4447, "lng": 78.4664, "zone": "Secunderabad"},
        "Malkajgiri": {"lat": 17.4520, "lng": 78.5320, "zone": "Secunderabad"},
        "Serilingampally": {"lat": 17.4833, "lng": 78.3167, "zone": "Serilingampally"},
        "Gachibowli": {"lat": 17.4401, "lng": 78.3489, "zone": "Serilingampally"},
        "HITEC City": {"lat": 17.4435, "lng": 78.3772, "zone": "Serilingampally"},
        "Kukatpally": {"lat": 17.4938, "lng": 78.3999, "zone": "Kukatpally"},
        "KPHB": {"lat": 17.4947, "lng": 78.3912, "zone": "Kukatpally"},
        "Miyapur": {"lat": 17.4968, "lng": 78.3614, "zone": "Kukatpally"},
        "LB Nagar": {"lat": 17.3457, "lng": 78.5522, "zone": "LB Nagar"},
        "Dilsukhnagar": {"lat": 17.3688, "lng": 78.5247, "zone": "LB Nagar"},
        "Uppal": {"lat": 17.4018, "lng": 78.5602, "zone": "LB Nagar"},
    }

    grievances = db.query(Grievance).filter(Grievance.status.notin_(['CLOSED'])).all()
    
    clusters = defaultdict(lambda: {
        "location": "",
        "zone": "Central",
        "lat": 17.3850,
        "lng": 78.4867,
        "count": 0,
        "critical_count": 0,
        "categories": defaultdict(int),
        "grievance_ids": [],
        "severity_level": "NORMAL"
    })

    for g in grievances:
        loc_str = (g.location_text or "").strip()
        matched_loc = "Hyderabad Central"
        lat, lng, zone = 17.3850, 78.4867, "Central"
        
        # Match against known GHMC areas
        for area, coords in HYDERABAD_GEO_COORDS.items():
            if area.lower() in loc_str.lower() or area.lower() in (g.raw_text or "").lower():
                matched_loc = area
                lat, lng, zone = coords["lat"], coords["lng"], coords["zone"]
                break
                
        c = clusters[matched_loc]
        c["location"] = matched_loc
        c["zone"] = zone
        c["lat"] = lat
        c["lng"] = lng
        c["count"] += 1
        if g.priority == 1 or g.severity == "CRITICAL":
            c["critical_count"] += 1
        c["categories"][g.category or "General"] += 1
        c["grievance_ids"].append(g.tracking_id)

    # Format result list
    blackspots = []
    for loc, data in clusters.items():
        if data["count"] >= 3 or data["critical_count"] >= 1:
            intensity = "HIGH_RISK" if data["critical_count"] >= 2 or data["count"] >= 5 else "MODERATE"
        else:
            intensity = "LOW"
            
        blackspots.append({
            "location": loc,
            "zone": data["zone"],
            "lat": data["lat"],
            "lng": data["lng"],
            "active_tickets": data["count"],
            "critical_tickets": data["critical_count"],
            "intensity": intensity,
            "top_category": max(data["categories"], key=data["categories"].get) if data["categories"] else "General",
            "sample_ticket": data["grievance_ids"][0] if data["grievance_ids"] else ""
        })

    blackspots.sort(key=lambda x: (x["critical_tickets"] * 3 + x["active_tickets"]), reverse=True)
    return {
        "total_active_grievances": len(grievances),
        "total_clusters": len(blackspots),
        "blackspots": blackspots
    }

