from typing import TypedDict, Optional, Annotated
import operator

from langgraph.graph import StateGraph, START, END


class GrievanceState(TypedDict):
    """
    Represents the state of a grievance as it flows through the multi-agent pipeline.
    """
    raw_text: str
    language: str
    location_text: str
    ward_id: Optional[int]
    citizen_name: str
    citizen_phone: str
    citizen_email: str
    channel: str
    category: str
    sub_category: str
    severity: str
    sentiment: str
    confidence: float
    duplicate_info: Optional[dict]
    department_id: Optional[int]
    assigned_officer_id: Optional[int]
    priority: int
    sla_deadline: Optional[str]
    tracking_id: str
    agent_logs: Annotated[list, operator.add]
    error: Optional[str]


def classify_node(state: GrievanceState) -> dict:
    """
    Classifies the incoming grievance using the intake agent.
    """
    from agents import intake_agent
    from database import get_db
    
    db = next(get_db())
    try:
        result = intake_agent.run(state['raw_text'], state['language'], db)
        return {
            'category': result.get('category', ''),
            'sub_category': result.get('sub_category', ''),
            'severity': result.get('severity', ''),
            'sentiment': result.get('sentiment', ''),
            'confidence': result.get('confidence', 0.0),
            'duplicate_info': result.get('duplicate_info'),
            'agent_logs': [{'agent': 'intake', 'result': result}],
        }
    except Exception as e:
        return {'error': str(e), 'agent_logs': [{'agent': 'intake', 'error': str(e)}]}
    finally:
        db.close()


def route_node(state: GrievanceState) -> dict:
    """
    Routes the classified grievance to the appropriate department and officer.
    """
    from agents import routing_agent
    from database import get_db
    
    db = next(get_db())
    try:
        result = routing_agent.run(state.get('category', ''), state.get('severity', ''), state.get('ward_id'), db)
        return {
            'department_id': result.get('department_id'),
            'assigned_officer_id': result.get('assigned_officer_id'),
            'priority': result.get('priority', 0),
            'sla_deadline': str(result['sla_deadline']) if result.get('sla_deadline') else None,
            'agent_logs': [{'agent': 'routing', 'result': result}],
        }
    except Exception as e:
        return {'error': str(e), 'agent_logs': [{'agent': 'routing', 'error': str(e)}]}
    finally:
        db.close()


def communicate_node(state: GrievanceState) -> dict:
    """
    Generates an acknowledgement message for the citizen.
    """
    from agents import communication_agent
    try:
        result = communication_agent.generate_acknowledgement(
            citizen_name=state.get('citizen_name', 'Citizen'),
            tracking_id=state.get('tracking_id', ''),
            category=state.get('category', ''),
            sla_deadline=state.get('sla_deadline'),
            language=state.get('language', 'en'),
        )
        return {'agent_logs': [{'agent': 'communication', 'result': result}]}
    except Exception as e:
        return {'error': str(e), 'agent_logs': [{'agent': 'communication', 'error': str(e)}]}


def build_grievance_graph():
    """
    Constructs and compiles the StateGraph for the grievance processing pipeline.
    """
    graph = StateGraph(GrievanceState)
    
    graph.add_node('classify', classify_node)
    graph.add_node('route', route_node)
    graph.add_node('communicate', communicate_node)
    
    graph.add_edge(START, 'classify')
    graph.add_edge('classify', 'route')
    graph.add_edge('route', 'communicate')
    graph.add_edge('communicate', END)
    
    return graph.compile()


# Singleton instance of the compiled graph
grievance_graph = build_grievance_graph()
