"""
seed_data.py — Populate the database with realistic GHMC-style sample data
Run: python seed_data.py
"""
from database import init_db, SessionLocal, Department, Zone, Officer, Grievance, Citizen, AgentLog
from orchestrator import process_new_grievance
from datetime import datetime, timezone, timedelta
import random

DEPARTMENTS = [
    ("Sanitation & Solid Waste", "SAN", "Manages garbage collection, solid waste disposal, drain cleaning"),
    ("Roads & Infrastructure", "ROA", "Pothole repair, road maintenance, footpath, flyovers"),
    ("Water Supply & Sewerage", "WAT", "Water supply, pipeline maintenance, sewerage"),
    ("Electrical & Lighting", "ELE", "Street lighting, electrical maintenance"),
    ("Town Planning & Enforcement", "TPE", "Encroachment removal, building permissions, construction"),
    ("Animal Husbandry", "ANI", "Stray animal management, animal control"),
    ("Environmental & Pollution Control", "ENV", "Noise and air pollution control"),
    ("Public Relations", "PRL", "General citizen services and information"),
]

ZONES = [
    ("Kukatpally Zone", 1),
    ("LB Nagar Zone", 2),
    ("Charminar Zone", 3),
    ("Secunderabad Zone", 4),
    ("Serilingampally Zone", 5),
    ("Uppal Zone", 6),
]

OFFICER_NAMES = [
    "Ravi Kumar", "Priya Sharma", "Mohammed Salim", "Lakshmi Devi",
    "Suresh Reddy", "Anitha Rao", "Kiran Naik", "Venkat Babu",
    "Divya Krishnan", "Rajesh Patil", "Swathi Menon", "Arun Teja",
    "Fatima Begum", "Srinivas Goud", "Meera Nair", "Praveen Chandra",
    "Saritha Varma", "Harish Babu", "Nandita Singh", "Ramesh Yadav",
]

SAMPLE_GRIEVANCES = [
    ("There is a huge pothole on the main road near Kukatpally metro station. It's been there for months and is causing accidents.", "Roads & Infrastructure", "Kukatpally Zone"),
    ("Garbage has not been collected from our street for 5 days. The smell is unbearable. Please send the garbage vehicle immediately.", "Sanitation", "LB Nagar Zone"),
    ("The street light near our colony gate is not working for the past 3 weeks. It is very dark at night and unsafe.", "Street Lighting", "Secunderabad Zone"),
    ("There is a major water pipe leakage near Charminar circle. A lot of water is being wasted and the road is flooded.", "Water Supply", "Charminar Zone"),
    ("Stray dogs are attacking people in our area. Three people have already been bitten this week. This is an emergency!", "Stray Animals", "Uppal Zone"),
    ("Illegal construction is happening on the footpath in front of our building. The builder has encroached 10 feet of public land.", "Encroachment", "Serilingampally Zone"),
    ("The drain near our house is completely blocked and overflowing. Sewage water is coming into our homes. Urgent help needed.", "Sanitation", "Kukatpally Zone"),
    ("No water supply in our area since 2 days. We have small children and elderly at home. Please restore supply urgently.", "Water Supply", "LB Nagar Zone"),
    ("A loudspeaker is being used from 5 AM every morning near the temple causing noise pollution. Please take action.", "Noise Pollution", "Charminar Zone"),
    ("The flyover near Uppal is showing cracks and seems structurally unsafe. It should be inspected immediately by engineers.", "Roads & Infrastructure", "Uppal Zone"),
    ("Overflowing garbage bin at bus stop not cleared for 7 days. Pathetic service from GHMC. Dogs are spreading the garbage.", "Sanitation", "Secunderabad Zone"),
    ("Street light pole has fallen on the road after rain. It is a danger to vehicles passing by. Please remove it urgently.", "Street Lighting", "Serilingampally Zone"),
]


def seed():
    init_db()
    db = SessionLocal()

    # Clear existing data
    for model in [AgentLog, Grievance, Citizen, Officer, Department, Zone]:
        db.query(model).delete()
    db.commit()
    print("Cleared existing data.")

    # Seed Departments
    dept_map = {}
    for name, code, desc in DEPARTMENTS:
        d = Department(name=name, code=code, description=desc)
        db.add(d)
        db.flush()
        dept_map[name] = d.id
    db.commit()
    print(f"Added {len(DEPARTMENTS)} departments.")

    # Seed Zones
    zone_map = {}
    for zname, ward in ZONES:
        z = Zone(name=zname, ward_number=ward)
        db.add(z)
        db.flush()
        zone_map[zname] = z.id
    db.commit()
    print(f"Added {len(ZONES)} zones.")

    # Seed Officers (2-3 per dept)
    dept_list = list(dept_map.items())
    zone_list = list(zone_map.items())
    officer_idx = 0

    for dept_name, dept_id in dept_list:
        for role in ["Field Officer", "Field Officer", "Department Head"]:
            if officer_idx >= len(OFFICER_NAMES):
                break
            name = OFFICER_NAMES[officer_idx]
            zone_name, zone_id = zone_list[officer_idx % len(zone_list)]
            o = Officer(
                name=name,
                email=f"{name.lower().replace(' ', '.')}@ghmc.gov.in",
                phone=f"9{random.randint(100000000, 999999999)}",
                role=role,
                department_id=dept_id,
                zone_id=zone_id,
                current_load=random.randint(0, 5),
            )
            db.add(o)
            officer_idx += 1
    db.commit()
    print(f"Added {officer_idx} officers.")

    # Seed Grievances with full AI pipeline
    print("Running AI pipeline for sample grievances...")
    for i, (text, expected_cat, location) in enumerate(SAMPLE_GRIEVANCES):
        phone = f"98765{43210 + i:05d}"
        try:
            g = process_new_grievance(
                raw_text=text,
                language="en",
                location_text=location,
                ward_id=None,
                citizen_name=f"Citizen {i+1}",
                citizen_phone=phone,
                citizen_email=f"citizen{i+1}@example.com",
                channel=random.choice(["WEB", "MOBILE", "WHATSAPP"]),
                db=db,
            )
            # Simulate some in-progress, some resolved
            if i % 4 == 0:
                g.status = "IN_PROGRESS"
                g.updated_at = datetime.now(timezone.utc) - timedelta(hours=random.randint(2, 20))
            elif i % 4 == 1:
                g.status = "RESOLVED"
                g.resolution_notes = "Issue has been fixed by the field team. Photos uploaded."
                g.resolved_at = datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 12))
                g.csat_score = random.choice([3, 4, 4, 5])
            elif i % 4 == 2:
                # Leave as ASSIGNED with old SLA (will trigger escalation)
                g.sla_deadline = datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 10))
            db.commit()
            print(f"  [{i+1}/{len(SAMPLE_GRIEVANCES)}] {g.tracking_id} — {g.category} ({g.status})")
        except Exception as e:
            print(f"  ERROR for grievance {i+1}: {e}")
            db.rollback()

    # Run tracking agent to create some escalations
    from agents.tracking_agent import run_escalation_check
    actions = run_escalation_check(db)
    print(f"\nTracking agent created {len(actions)} escalation events.")

    print("\nSeed data complete! Database ready.")
    db.close()


if __name__ == "__main__":
    seed()
