"""
intake_agent.py — Intake & Classification Agent
Simulates LLM-based classification, severity scoring, sentiment analysis,
duplicate detection, and structured grievance record creation.
"""
import time
import random
import hashlib
from datetime import datetime, timezone

from agents.llm import llm, LLMUnavailable

# ─────────────────────────────────────────────
# Knowledge Base: Category taxonomy
# ─────────────────────────────────────────────
CATEGORY_TAXONOMY = {
    "Sanitation": {
        "subcategories": ["Garbage Collection", "Solid Waste", "Drain Cleaning", "Public Toilet", "Street Sweeping"],
        "keywords": ["garbage", "trash", "waste", "dustbin", "bin", "sweeping", "drain", "sewer", "toilet", "smell", "odor", "clean", "dirty", "litter", "dump", "कचरा", "गंदगी", "साफ", "सफाई", "చెత్త", "శుభ్రం", "వాసన"],
        "default_severity": "MEDIUM",
        "default_sla_hours": 48,
    },
    "Roads & Infrastructure": {
        "subcategories": ["Pothole", "Road Damage", "Footpath", "Flyover", "Speed Breaker", "Road Marking"],
        "keywords": ["pothole", "road", "crack", "footpath", "pavement", "bridge", "flyover", "broken", "damaged road", "manhole", "speed breaker", "सड़क", "गड्ढा", "रोड", "రోడ్డు", "గుంత"],
        "default_severity": "HIGH",
        "default_sla_hours": 72,
    },
    "Water Supply": {
        "subcategories": ["No Water Supply", "Water Leakage", "Water Quality", "Pipeline Damage", "Meter Issue"],
        "keywords": ["water", "pipe", "leak", "supply", "tap", "drainage", "flood", "overflow", "meter", "borewell", "पानी", "पाइप", "नीరు", "నీళ్ల", "పైపు"],
        "default_severity": "HIGH",
        "default_sla_hours": 24,
    },
    "Street Lighting": {
        "subcategories": ["Light Not Working", "New Light Required", "Light Flickering", "Pole Damage"],
        "keywords": ["light", "lamp", "street light", "dark", "bulb", "pole", "electricity", "power", "बिजली", "बत्ती", "अंधेरा", "లైట్", "విద్యుత్", "చీకటి"],
        "default_severity": "LOW",
        "default_sla_hours": 72,
    },
    "Encroachment": {
        "subcategories": ["Illegal Construction", "Road Encroachment", "Footpath Blocked", "Illegal Parking"],
        "keywords": ["encroach", "illegal", "unauthorized", "blocked", "occupy", "parking", "vendor", "hawker", "construction", "कब्जा", "अतिक्रमण", "ఆక్రమణ"],
        "default_severity": "MEDIUM",
        "default_sla_hours": 96,
    },
    "Stray Animals": {
        "subcategories": ["Stray Dogs", "Stray Cattle", "Animal Attack", "Animal Menace"],
        "keywords": ["dog", "stray", "animal", "cattle", "cow", "bite", "attack", "menace", "wild", "कुत्ता", "जानवर", "పశువులు", "కుక్క"],
        "default_severity": "HIGH",
        "default_sla_hours": 24,
    },
    "Building & Construction": {
        "subcategories": ["Unauthorized Construction", "Building Collapse Risk", "Demolition", "Permission Issue"],
        "keywords": ["building", "construction", "demolish", "collapse", "structure", "permission", "floor", "plan", "इमारत", "निर्माण", "భవనం", "నిర్మాణం"],
        "default_severity": "HIGH",
        "default_sla_hours": 48,
    },
    "Noise Pollution": {
        "subcategories": ["Loudspeaker Noise", "Industrial Noise", "Construction Noise", "Vehicle Noise"],
        "keywords": ["noise", "sound", "loud", "speaker", "horn", "disturb", "pollution", "music", "आवाज", "शोर", "శబ్దం", "గోల"],
        "default_severity": "LOW",
        "default_sla_hours": 96,
    },
    "Other": {
        "subcategories": ["General Complaint", "Feedback", "Information Request"],
        "keywords": [],
        "default_severity": "LOW",
        "default_sla_hours": 120,
    },
}

SENTIMENT_KEYWORDS = {
    "ANGRY": ["disgusting", "pathetic", "useless", "worst", "terrible", "horrible", "ridiculous", "shameful", "outrageous", "fed up", "fed-up", "enough"],
    "NEGATIVE": ["bad", "problem", "issue", "broken", "not working", "dirty", "unsafe", "dangerous", "poor", "fail", "complain"],
    "POSITIVE": ["good", "excellent", "thanks", "appreciate", "helpful", "resolved", "happy", "satisfied"],
    "NEUTRAL": [],
}

SEVERITY_BOOSTERS = {
    "CRITICAL": ["accident", "collapse", "fire", "flood", "emergency", "danger", "life-threatening", "electric shock"],
    "HIGH": ["urgent", "severe", "major", "serious", "long time", "months", "weeks", "repeat"],
    "LOW": ["minor", "small", "slight", "little"],
}


def _score_category(text: str) -> tuple[str, str, float]:
    text_lower = text.lower()
    scores = {}
    for cat, info in CATEGORY_TAXONOMY.items():
        score = sum(1 for kw in info["keywords"] if kw in text_lower)
        if score > 0:
            scores[cat] = score

    if not scores:
        return "Other", "General Complaint", 0.52

    best_cat = max(scores, key=scores.get)
    total = sum(scores.values())
    confidence = min(0.95, 0.55 + (scores[best_cat] / max(total, 1)) * 0.4 + random.uniform(-0.03, 0.03))

    subcats = CATEGORY_TAXONOMY[best_cat]["subcategories"]
    # Simple subcategory heuristic
    sub = subcats[0]
    for s in subcats:
        if any(w in text_lower for w in s.lower().split()):
            sub = s
            break

    return best_cat, sub, round(confidence, 2)


def _score_sentiment(text: str) -> str:
    text_lower = text.lower()
    for sentiment, keywords in SENTIMENT_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return sentiment
    return "NEUTRAL"


def _score_severity(text: str, category: str) -> str:
    text_lower = text.lower()
    for level in ["CRITICAL", "HIGH", "LOW"]:
        if any(kw in text_lower for kw in SEVERITY_BOOSTERS.get(level, [])):
            return level
    return CATEGORY_TAXONOMY.get(category, {}).get("default_severity", "MEDIUM")


def _check_duplicate(text: str, db) -> dict | None:
    """Simple hash-based duplicate detection against recent grievances"""
    from database import Grievance
    from sqlalchemy import text as sa_text

    text_hash = hashlib.md5(text.strip().lower().encode()).hexdigest()[:8]
    # In a real system we'd use vector similarity; here we do keyword overlap
    words = set(text.lower().split())
    recent = db.query(Grievance).filter(
        Grievance.status.notin_(["CLOSED", "RESOLVED"])
    ).order_by(Grievance.created_at.desc()).limit(50).all()

    for g in recent:
        existing_words = set(g.raw_text.lower().split())
        overlap = len(words & existing_words) / max(len(words | existing_words), 1)
        if overlap > 0.6:
            return {
                "tracking_id": g.tracking_id,
                "category": g.category,
                "location": g.location_text or "same area"
            }

    return None


def _classify_with_llm(grievance_text: str):
    """Ask a real LLM to classify the grievance. Returns
    (category, sub_category, severity, sentiment, confidence) or None on failure."""
    categories = list(CATEGORY_TAXONOMY.keys())
    taxonomy_hint = "; ".join(
        f"{cat}: {', '.join(info['subcategories'])}" for cat, info in CATEGORY_TAXONOMY.items()
    )
    system = (
        "You are the Intake & Classification agent for an Indian municipal grievance "
        "system (GHMC). Classify the citizen complaint precisely. "
        "Return JSON only."
    )
    user = (
        f"Complaint: \"{grievance_text}\"\n\n"
        f"Valid categories and sub-categories — {taxonomy_hint}.\n\n"
        "Respond with a JSON object exactly like:\n"
        '{"category": <one of the categories>, "sub_category": <matching sub-category>, '
        '"severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL", '
        '"sentiment": "POSITIVE"|"NEUTRAL"|"NEGATIVE"|"ANGRY", '
        '"confidence": <0..1 float>}'
    )
    try:
        data = llm.complete_json(system, user)
    except LLMUnavailable as e:
        print(f"[Intake Agent] LLM unavailable, using simulation: {e}")
        return None

    category = data.get("category")
    if category not in CATEGORY_TAXONOMY:
        return None
    valid_subs = CATEGORY_TAXONOMY[category]["subcategories"]
    sub_category = data.get("sub_category")
    if sub_category not in valid_subs:
        sub_category = valid_subs[0]
    severity = str(data.get("severity", "MEDIUM")).upper()
    if severity not in ("LOW", "MEDIUM", "HIGH", "CRITICAL"):
        severity = CATEGORY_TAXONOMY[category]["default_severity"]
    sentiment = str(data.get("sentiment", "NEUTRAL")).upper()
    if sentiment not in ("POSITIVE", "NEUTRAL", "NEGATIVE", "ANGRY"):
        sentiment = "NEUTRAL"
    try:
        confidence = round(min(0.99, max(0.5, float(data.get("confidence", 0.85)))), 2)
    except (TypeError, ValueError):
        confidence = 0.85
    return category, sub_category, severity, sentiment, confidence


def run(grievance_text: str, language: str, db) -> dict:
    """
    Main intake agent entry point.
    Returns structured output for orchestrator consumption.

    Uses a real LLM when one is configured; otherwise falls back to the
    deterministic keyword-based classifier so the system always works offline.
    """
    t0 = time.time()

    used_llm = False
    llm_result = _classify_with_llm(grievance_text) if llm.enabled else None
    if llm_result:
        category, sub_category, severity, sentiment, confidence = llm_result
        used_llm = True
    else:
        category, sub_category, confidence = _score_category(grievance_text)
        sentiment = _score_sentiment(grievance_text)
        severity = _score_severity(grievance_text, category)

    duplicate_info = _check_duplicate(grievance_text, db)
    duplicate_cluster = duplicate_info["tracking_id"] if duplicate_info else None

    # Simulated Entity Extraction (Location & Name)
    entities = {}
    words = grievance_text.split()
    
    # Try to find location indicators
    loc_keywords = ["at", "near", "in", "street", "road", "colony", "nagar", "circle", "junction"]
    loc_parts = []
    for i, w in enumerate(words):
        if w.lower() in loc_keywords and i + 1 < len(words):
            loc_parts = words[i:i+4]  # capture next 3 words
            break
            
    # Also look for capitalized words as hints
    loc_hints = [w for w in words if any(c.isupper() for c in w) and len(w) > 3]
    
    if loc_parts:
        entities["location"] = " ".join(loc_parts)
    elif loc_hints:
        entities["location"] = " ".join(loc_hints[:3])
        
    # Simulate finding a name (e.g. "my name is X", "I am X")
    text_lower = grievance_text.lower()
    if "my name is" in text_lower:
        idx = text_lower.find("my name is") + 10
        entities["name"] = grievance_text[idx:].strip().split()[0].title()
    elif "i am" in text_lower:
        idx = text_lower.find("i am") + 4
        entities["name"] = grievance_text[idx:].strip().split()[0].title()

    duration_ms = int((time.time() - t0) * 1000) + random.randint(200, 800)

    engine = f"LLM ({llm.provider}/{llm.model})" if used_llm else "keyword simulation"
    reasoning = (
        f"Analyzed complaint text ({len(grievance_text)} chars) via {engine}. "
        f"Matched {category} taxonomy with {int(confidence*100)}% confidence. "
        f"Sentiment detected as {sentiment}. "
        f"Severity assessed as {severity} based on text cues. "
        + (f"Duplicate cluster detected: {duplicate_cluster}." if duplicate_cluster else "No duplicates found.")
    )

    return {
        "category": category,
        "sub_category": sub_category,
        "severity": severity,
        "sentiment": sentiment,
        "language": language,
        "confidence": confidence,
        "duplicate_cluster_id": duplicate_cluster,
        "duplicate_info": duplicate_info,
        "extracted_entities": entities,
        "reasoning": reasoning,
        "duration_ms": duration_ms,
        "action": "classify_and_structure",
        "engine": "llm" if used_llm else "simulation",
    }
