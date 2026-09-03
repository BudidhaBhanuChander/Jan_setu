import time
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from database import get_db, Grievance, StatusEvent
import os

def check_slas():
    db = next(get_db())
    now = datetime.now(timezone.utc)
    
    # Find all open grievances that have passed their SLA
    expired_grievances = db.query(Grievance).filter(
        Grievance.status.in_(["NEW", "ASSIGNED", "IN_PROGRESS"]),
        Grievance.sla_deadline != None,
        Grievance.sla_deadline < now
    ).all()
    
    count = 0
    for g in expired_grievances:
        prev_status = g.status
        g.status = "ESCALATED"
        
        # Add audit event
        event = StatusEvent(
            grievance_id=g.id,
            from_status=prev_status,
            to_status="ESCALATED",
            actor="Watchdog AI",
            note="SLA breached. Automatically escalated to L2 Commissioner."
        )
        db.add(event)
        count += 1
        
    db.commit()
    db.close()
    if count > 0:
        print(f"[{now.isoformat()}] Watchdog: Escalated {count} SLA-breached grievances to L2.")

if __name__ == "__main__":
    print("Starting Watchdog AI Agent...")
    while True:
        try:
            check_slas()
        except Exception as e:
            print(f"Watchdog Error: {e}")
        time.sleep(10) # Run every 10 seconds for demo purposes
