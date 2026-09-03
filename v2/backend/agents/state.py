from typing import TypedDict, Optional, Annotated, List, Any
import operator

def add_logs(left: list, right: list):
    return left + right

class GrievanceState(TypedDict):
    # Input data
    raw_text: str
    language: str
    channel: str
    location_text: str
    has_image: bool
    citizen_id: Optional[int]
    ward_id: Optional[int]
    
    # Context / DB references
    db_session: Any  # We'll pass the session in
    
    # Output of Intake Node
    category: Optional[str]
    sub_category: Optional[str]
    severity: Optional[str]
    sentiment: Optional[str]
    is_spam: bool
    duplicate_cluster_id: Optional[str]
    
    # Output of Routing Node
    department_id: Optional[int]
    assigned_officer_id: Optional[int]
    priority: int
    priority_score: Optional[float]
    priority_reason: Optional[str]
    sla_deadline: Optional[str] # ISO format
    
    # Output of Database Commit Node
    tracking_id: Optional[str]
    status: Optional[str]
    
    # Logs and flow control
    agent_logs: Annotated[list, add_logs]
    error: Optional[str]
