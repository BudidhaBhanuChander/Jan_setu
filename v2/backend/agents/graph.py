from langgraph.graph import StateGraph, START, END
from agents.state import GrievanceState
from agents import intake_agent, routing_agent, communication_agent
from datetime import datetime, timedelta, timezone

def intake_node(state: GrievanceState):
    db = state.get("db_session")
    if not db:
        return {"error": "No DB session provided"}
    
    try:
        result = intake_agent.run(state["raw_text"], state["language"], db)
        
        return {
            "category": result.get("category"),
            "sub_category": result.get("sub_category"),
            "severity": result.get("severity", "MEDIUM"),
            "sentiment": result.get("sentiment", "NEUTRAL"),
            "duplicate_cluster_id": result.get("duplicate_info", {}).get("cluster_id") if result.get("duplicate_info") else None,
            "agent_logs": [{"agent": "intake", "result": "Success"}]
        }
    except Exception as e:
        print(f"Intake Node Error: {e}")
        return {"error": str(e), "agent_logs": [{"agent": "intake", "error": str(e)}]}

def routing_node(state: GrievanceState):
    if state.get("error") or state.get("is_spam"):
        return {} # Skip routing if spam or error
    
    db = state.get("db_session")
    try:
        result = routing_agent.run(
            category=state.get("category"),
            severity=state.get("severity"),
            ward_id=state.get("ward_id"),
            db=db,
            raw_text=state.get("raw_text", ""),
            location_text=state.get("location_text", "")
        )
        return {
            "department_id": result.get("department_id"),
            "assigned_officer_id": result.get("assigned_officer_id"),
            "priority": result.get("priority", 3),
            "priority_score": result.get("priority_score", 50.0),
            "priority_reason": result.get("priority_reason", ""),
            "severity": result.get("computed_severity", state.get("severity", "MEDIUM")),
            "sla_deadline": str(result.get("sla_deadline")) if result.get("sla_deadline") else None,
            "agent_logs": [{"agent": "routing", "result": "Success"}]
        }
    except Exception as e:
        print(f"Routing Node Error: {e}")
        return {"error": str(e), "agent_logs": [{"agent": "routing", "error": str(e)}]}

def communicate_node(state: GrievanceState):
    if state.get("error") or state.get("is_spam"):
        return {}
    
    try:
        res = communication_agent.generate_acknowledgement(
            citizen_name=state.get("citizen_name", "Citizen"),
            tracking_id=state.get("tracking_id", ""),
            category=state.get("category", "General"),
            sla_deadline=state.get("sla_deadline"),
            language=state.get("language", "en")
        )
        return {"agent_logs": [{"agent": "communication", "result": res.get("message", "Sent")}]}
    except Exception as e:
        print(f"Communication Node Notice: {e}")
        return {"agent_logs": [{"agent": "communication", "error": str(e)}]}

def should_route(state: GrievanceState):
    if state.get("error") or state.get("is_spam"):
        return END
    return "routing_node"

def build_grievance_graph():
    builder = StateGraph(GrievanceState)
    
    builder.add_node("intake_node", intake_node)
    builder.add_node("routing_node", routing_node)
    builder.add_node("communicate_node", communicate_node)
    
    builder.add_edge(START, "intake_node")
    builder.add_conditional_edges("intake_node", should_route)
    builder.add_edge("routing_node", "communicate_node")
    builder.add_edge("communicate_node", END)
    
    return builder.compile()

grievance_graph = build_grievance_graph()
