"""
models.py — Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# ─────────────────────────────────────────────
# Citizen
# ─────────────────────────────────────────────
class CitizenCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    preferred_language: Optional[str] = "en"
    address: Optional[str] = ""


class CitizenOut(BaseModel):
    id: int
    name: str
    phone: str
    email: str
    preferred_language: str
    verification_status: str
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Grievance
# ─────────────────────────────────────────────
class GrievanceCreate(BaseModel):
    raw_text: str
    channel: Optional[str] = "WEB"
    language: Optional[str] = "en"
    location_text: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    citizen_name: Optional[str] = "Anonymous"
    citizen_phone: Optional[str] = ""
    citizen_email: Optional[str] = ""


class StatusEventOut(BaseModel):
    id: int
    from_status: str
    to_status: str
    actor: str
    agent_name: str
    note: str
    ai_confidence: Optional[float]
    ai_reasoning: str
    timestamp: datetime
    class Config:
        from_attributes = True


class EscalationOut(BaseModel):
    id: int
    level: int
    reason: str
    escalated_to: str
    breach_predicted: bool
    is_resolved: bool
    created_at: datetime
    class Config:
        from_attributes = True


class GrievanceOut(BaseModel):
    id: int
    tracking_id: str
    raw_text: str
    channel: str
    language: str
    location_text: str
    category: str
    sub_category: str
    severity: str
    sentiment: str
    classification_confidence: float
    status: str
    priority: int
    sla_deadline: Optional[datetime]
    resolution_notes: str
    csat_score: Optional[int]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime]
    department_id: Optional[int]
    assigned_officer_id: Optional[int]
    routing_confidence: float
    has_image: bool
    events: List[StatusEventOut] = []
    escalations: List[EscalationOut] = []
    class Config:
        from_attributes = True


class GrievanceUpdate(BaseModel):
    status: Optional[str] = None
    resolution_notes: Optional[str] = None
    csat_score: Optional[int] = None
    feedback_comment: Optional[str] = None


class FeedbackCreate(BaseModel):
    csat_score: int = Field(..., ge=1, le=5, description="Citizen satisfaction score, 1-5")
    comment: Optional[str] = ""


# ─────────────────────────────────────────────
# Officer
# ─────────────────────────────────────────────
class OfficerOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    role: str
    department_id: Optional[int]
    zone_id: Optional[int]
    current_load: int
    is_active: bool
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Department
# ─────────────────────────────────────────────
class DepartmentOut(BaseModel):
    id: int
    name: str
    code: str
    description: str
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Agent Log
# ─────────────────────────────────────────────
class AgentLogOut(BaseModel):
    id: int
    grievance_id: Optional[int]
    tracking_id: str
    agent_name: str
    action: str
    input_summary: str
    output_summary: str
    confidence: Optional[float]
    reasoning: str
    duration_ms: int
    status: str
    timestamp: datetime
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# Analytics
# ─────────────────────────────────────────────
class AnalyticsOverview(BaseModel):
    total: int
    open: int
    resolved: int
    escalated: int
    avg_resolution_hours: float
    resolution_rate: float
    sla_breached: int
    sla_compliance_rate: float


class CategoryStat(BaseModel):
    category: str
    count: int


class SeverityStat(BaseModel):
    severity: str
    count: int


class StatusStat(BaseModel):
    status: str
    count: int


class WardStat(BaseModel):
    ward: str
    count: int


class TrendPoint(BaseModel):
    date: str
    submitted: int
    resolved: int


class OfficerPerformance(BaseModel):
    officer_id: int
    name: str
    department: str
    role: str
    current_load: int
    total_assigned: int
    resolved: int
    escalated: int
    avg_resolution_hours: float
    avg_csat: float
    resolution_rate: float


class DepartmentPerformance(BaseModel):
    department_id: Optional[int]
    department: str
    code: str
    total: int
    resolved: int
    open: int
    escalated: int
    avg_resolution_hours: float
    sla_compliance_rate: float
    officer_count: int


class PaginatedGrievances(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[GrievanceOut]


class PublicStats(BaseModel):
    total_grievances: int
    resolved: int
    resolution_rate: float
    avg_resolution_hours: float
    sla_compliance_rate: float
    departments: int
    active_officers: int
