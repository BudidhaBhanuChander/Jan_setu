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
    username = Column(String, unique=True, index=True) # Phone, email, or handle
    hashed_password = Column(String)
    name = Column(String)
    role = Column(String, default="CITIZEN") # CITIZEN, OFFICER_L1, COMMISSIONER_L2, ADMIN
    
    # Contact & Profile Information
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    ward_colony = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    preferred_language = Column(String, default="en")
    
    # Official specific
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    current_load = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    negligence_strikes = Column(Integer, default=0)    # Contested false closures
    
    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    
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
    image_path = Column(String, default="")           # Citizen Before Image
    before_image_url = Column(String, default="")     # Explicit Before Proof URL
    location_text = Column(String, default="")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geohash = Column(String, default="")              # Precision Geo-Spatial Hash
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
    priority_score = Column(Float, default=50.0)      # Composite Multi-Factor Priority Score (0-100)
    priority_reason = Column(Text, default="")        # AI + Area Density + Inspection reasoning
    sla_deadline = Column(DateTime, nullable=True)
    routing_confidence = Column(Float, default=0.0)
    escalation_level = Column(Integer, default=0)     # 0=L1, 1=L2, etc.

    # Field Officer Ground Inspection
    field_inspection_notes = Column(Text, default="")
    field_inspected_at = Column(DateTime, nullable=True)
    field_inspected_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Status & Intermediary Lifecycle
    status = Column(String, default="NEW")            # NEW / CLASSIFIED / ASSIGNED / TEAM_DISPATCHED / ON_SITE_INSPECTION / WORK_IN_PROGRESS / RESOLVED / CLOSED / ESCALATED / REOPENED / DISPUTED
    resolution_notes = Column(Text, default="")
    resolution_image = Column(String, default="")     # Officer After Image
    after_image_url = Column(String, default="")      # Explicit After Proof URL
    csat_score = Column(Integer, nullable=True)       # 1-5
    feedback_comment = Column(Text, default="")

    # Citizen Dispute & Officer Negligence Handling
    dispute_reason = Column(Text, default="")
    dispute_image_url = Column(String, default="")
    disputed_at = Column(DateTime, nullable=True)
    is_negligence_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)
    resolved_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)

    # Relationships
    department = relationship("Department")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    events = relationship("StatusEvent", back_populates="grievance", order_by="StatusEvent.timestamp")
    escalations = relationship("Escalation", back_populates="grievance")

    @property
    def department_name(self) -> str:
        return self.department.name if self.department else ""

    @property
    def assigned_officer_name(self) -> str:
        return self.assigned_officer.name if self.assigned_officer else ""

    @property
    def assigned_officer_phone(self) -> str:
        return self.assigned_officer.phone if self.assigned_officer else ""


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
    escalated_to = Column(String, default="")         # Officer/role name
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
    
    # SQLite automatic schema migration for users and grievances tables
    with engine.connect() as conn:
        try:
            # Users table migration
            result = conn.exec_driver_sql("PRAGMA table_info(users)")
            existing_cols = {row[1] for row in result.fetchall()}
            new_columns = [
                ("phone", "VARCHAR"),
                ("email", "VARCHAR"),
                ("address", "VARCHAR"),
                ("ward_colony", "VARCHAR"),
                ("pincode", "VARCHAR"),
                ("is_active", "BOOLEAN DEFAULT 1"),
                ("negligence_strikes", "INTEGER DEFAULT 0"),
                ("created_at", "DATETIME")
            ]
            for col_name, col_type in new_columns:
                if col_name not in existing_cols:
                    conn.exec_driver_sql(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                    print(f"[DB Init] Migrated users table: added {col_name}")

            # Grievances table migration for dynamic priority, geohash, before/after images & dispute
            result_g = conn.exec_driver_sql("PRAGMA table_info(grievances)")
            existing_g_cols = {row[1] for row in result_g.fetchall()}
            new_g_columns = [
                ("priority_score", "FLOAT DEFAULT 50.0"),
                ("priority_reason", "TEXT DEFAULT ''"),
                ("field_inspection_notes", "TEXT DEFAULT ''"),
                ("field_inspected_at", "DATETIME"),
                ("field_inspected_by", "INTEGER"),
                ("before_image_url", "VARCHAR DEFAULT ''"),
                ("after_image_url", "VARCHAR DEFAULT ''"),
                ("geohash", "VARCHAR DEFAULT ''"),
                ("dispute_reason", "TEXT DEFAULT ''"),
                ("dispute_image_url", "VARCHAR DEFAULT ''"),
                ("disputed_at", "DATETIME"),
                ("is_negligence_verified", "BOOLEAN DEFAULT 0")
            ]
            for col_name, col_type in new_g_columns:
                if col_name not in existing_g_cols:
                    conn.exec_driver_sql(f"ALTER TABLE grievances ADD COLUMN {col_name} {col_type}")
                    print(f"[DB Init] Migrated grievances table: added {col_name}")

            # Agent logs table migration
            result_l = conn.exec_driver_sql("PRAGMA table_info(agent_logs)")
            existing_l_cols = {row[1] for row in result_l.fetchall()}
            if "timestamp" not in existing_l_cols:
                conn.exec_driver_sql("ALTER TABLE agent_logs ADD COLUMN timestamp DATETIME")
                print("[DB Init] Migrated agent_logs table: added timestamp")

            conn.commit()
        except Exception as e:
            print(f"[DB Init] Migration notice: {e}")

    # Auto-seed baseline departments and admin if empty
    db = SessionLocal()
    try:
        from auth import get_password_hash
        dept_count = db.query(Department).count()
        if dept_count == 0:
            default_depts = [
                Department(name="Sanitation & Solid Waste", code="SAN", description="Garbage collection, solid waste disposal, drain cleaning"),
                Department(name="Roads & Infrastructure", code="ROA", description="Pothole repair, road maintenance, footpath, flyovers"),
                Department(name="Water Supply & Sewerage", code="WAT", description="Water supply, pipeline maintenance, sewerage"),
                Department(name="Electrical & Lighting", code="ELE", description="Street lighting, electrical maintenance"),
                Department(name="Town Planning & Enforcement", code="TPE", description="Encroachment removal, building permissions"),
                Department(name="Public Health & Vector Control", code="HLT", description="Mosquito fogging, disease control, health"),
                Department(name="Animal Husbandry", code="ANI", description="Stray animal management, dog sterilization"),
            ]
            db.add_all(default_depts)
            db.commit()

        # Ensure demo accounts exist
        pwd = get_password_hash("pass123")
        demo_users = [
            ("admin", "GHMC Super Admin", "ADMIN", None),
            ("citizen1", "Aarav Sharma", "CITIZEN", None),
            ("officer1", "Ravi Kumar", "OFFICER_L1", 1),
            ("commissioner", "Dr. K. Srinivas", "COMMISSIONER_L2", None),
            ("zonal_comm", "Dr. K. Srinivas", "COMMISSIONER_L2", None),
        ]
        for uname, uname_full, urole, udept in demo_users:
            if not db.query(User).filter(User.username == uname).first():
                u = User(
                    username=uname,
                    hashed_password=pwd,
                    name=uname_full,
                    role=urole,
                    department_id=udept,
                    phone="9876543210",
                    ward_colony="Jubilee Hills",
                    preferred_language="en",
                    is_active=True
                )
                db.add(u)
        db.commit()
    except Exception as e:
        print(f"[DB Init] Demo seeding notice: {e}")
    finally:
        db.close()
