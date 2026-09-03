"""
database.py — SQLAlchemy models and DB setup for Jan Setu AI Grievance Redressal System
"""
import json
from datetime import datetime, timezone
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, DateTime,
    Boolean, Text, ForeignKey, JSON
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship

from config import settings

DATABASE_URL = settings.DATABASE_URL
# check_same_thread is a SQLite-only argument; guard it so other backends work too.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def utcnow():
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────
# ORM Models
# ─────────────────────────────────────────────

class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    code = Column(String, unique=True)
    description = Column(Text, default="")
    officers = relationship("Officer", back_populates="department")


class Zone(Base):
    __tablename__ = "zones"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    ward_number = Column(Integer)
    city = Column(String, default="Hyderabad")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True) # Phone or email
    hashed_password = Column(String)
    name = Column(String)
    role = Column(String, default="CITIZEN") # CITIZEN, OFFICER_L1, COMMISSIONER_L2, ADMIN
    
    # Official specific
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    current_load = Column(Integer, default=0)
    
    # Citizen specific
    preferred_language = Column(String, default="en")
    
    # Relationships
    department = relationship("Department", back_populates="officers")

Department.officers = relationship("User", back_populates="department")


class Grievance(Base):
    __tablename__ = "grievances"
    id = Column(Integer, primary_key=True, index=True)
    tracking_id = Column(String, unique=True, index=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Raw input
    raw_text = Column(Text)
    channel = Column(String, default="WEB")           # WEB / MOBILE / WHATSAPP / IVR
    language = Column(String, default="en")
    has_image = Column(Boolean, default=False)
    image_path = Column(String, default="")
    location_text = Column(String, default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    ward_id = Column(Integer, ForeignKey("zones.id"), nullable=True)

    # AI Classification (Intake Agent)
    category = Column(String, default="")
    sub_category = Column(String, default="")
    severity = Column(String, default="MEDIUM")       # LOW / MEDIUM / HIGH / CRITICAL
    sentiment = Column(String, default="NEUTRAL")     # POSITIVE / NEUTRAL / NEGATIVE / ANGRY
    duplicate_cluster_id = Column(String, nullable=True)
    classification_confidence = Column(Float, default=0.0)
    extracted_entities = Column(Text, default="{}")   # JSON string

    # Routing & Escalation (Routing/Watchdog Agent)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    assigned_officer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    priority = Column(Integer, default=3)             # 1=Critical, 2=High, 3=Normal, 4=Low
    sla_deadline = Column(DateTime, nullable=True)
    routing_confidence = Column(Float, default=0.0)
    escalation_level = Column(Integer, default=0)     # 0=L1, 1=L2, etc.

    # Status & lifecycle
    status = Column(String, default="NEW")            # NEW / CLASSIFIED / ASSIGNED / IN_PROGRESS / RESOLVED / CLOSED / ESCALATED / REOPENED
    resolution_notes = Column(Text, default="")
    resolution_image = Column(String, default="")
    csat_score = Column(Integer, nullable=True)       # 1-5
    feedback_comment = Column(Text, default="")

    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    events = relationship("StatusEvent", back_populates="grievance", order_by="StatusEvent.timestamp")
    escalations = relationship("Escalation", back_populates="grievance")


class StatusEvent(Base):
    __tablename__ = "status_events"
    id = Column(Integer, primary_key=True, index=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"))
    from_status = Column(String)
    to_status = Column(String)
    actor = Column(String, default="SYSTEM")          # SYSTEM / AI_AGENT / OFFICER / CITIZEN
    agent_name = Column(String, default="")
    note = Column(Text, default="")
    evidence_url = Column(String, default="")
    ai_confidence = Column(Float, nullable=True)
    ai_reasoning = Column(Text, default="")           # Agent's reasoning
    timestamp = Column(DateTime, default=utcnow)
    grievance = relationship("Grievance", back_populates="events")


class Escalation(Base):
    __tablename__ = "escalations"
    id = Column(Integer, primary_key=True, index=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"))
    level = Column(Integer, default=1)                # 1=Officer nudge, 2=Dept Head, 3=Zonal Officer
    reason = Column(Text)
    escalated_to = Column(String)                     # Officer/role name
    breach_predicted = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utcnow)
    grievance = relationship("Grievance", back_populates="escalations")


class AgentLog(Base):
    """Audit trail for every AI agent decision"""
    __tablename__ = "agent_logs"
    id = Column(Integer, primary_key=True, index=True)
    grievance_id = Column(Integer, ForeignKey("grievances.id"), nullable=True)
    tracking_id = Column(String, default="")
    agent_name = Column(String)                       # intake / routing / tracking / communication
    action = Column(String)
    input_summary = Column(Text, default="")
    output_summary = Column(Text, default="")
    confidence = Column(Float, nullable=True)
    reasoning = Column(Text, default="")
    duration_ms = Column(Integer, default=0)
    status = Column(String, default="SUCCESS")        # SUCCESS / FAILED / PENDING_HUMAN
    timestamp = Column(DateTime, default=utcnow)


def init_db():
    Base.metadata.create_all(bind=engine)
