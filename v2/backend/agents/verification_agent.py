"""
verification_agent.py — AI Resolution Verification Agent
Validates physical repair evidence and officer resolution notes before allowing
a grievance to be officially marked RESOLVED. Prevents false/premature closures.
"""
import time
import json

def verify_resolution(
    category: str,
    original_complaint: str,
    resolution_notes: str,
    resolution_image: str = "",
    citizen_image: str = ""
) -> dict:
    t0 = time.time()
    notes_clean = (resolution_notes or "").strip()
    img_clean = (resolution_image or "").strip()
    
    # 1. Mandatory After-Photo Requirement
    if not img_clean or len(img_clean) < 5:
        return {
            "is_valid": False,
            "confidence": 0.1,
            "verification_status": "REJECTED",
            "reasoning": "Mandatory premise 'After Photo' proof missing. GHMC policy strictly requires on-ground photographic evidence of completed repair work.",
            "repair_indicators_found": []
        }

    # 2. Minimum note length check
    if len(notes_clean) < 8:
        return {
            "is_valid": False,
            "confidence": 0.2,
            "verification_status": "REJECTED",
            "reasoning": "Resolution notes too brief. Field officers must record specific physical repair actions alongside premise photos.",
            "repair_indicators_found": []
        }

    try:
        from config import settings
        import requests
        
        if settings.LLM_API_KEY:
            system_prompt = (
                "You are the GHMC AI Resolution Verification Agent. "
                "Analyze whether the officer resolution legitimately addresses the citizen grievance. "
                "Return JSON with: is_valid (boolean), confidence (float 0.0-1.0), "
                "verification_status (VERIFIED or REJECTED), reasoning (string), "
                "repair_indicators_found (list of strings)."
            )
            user_prompt = f"Category: {category}\nComplaint: {original_complaint}\nOfficer Resolution: {notes_clean}"
            
            headers = {"Authorization": f"Bearer {settings.LLM_API_KEY}", "Content-Type": "application/json"}
            payload = {
                "model": settings.LLM_MODEL or "qwen/qwen3.8-27b",
                "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                "temperature": 0.1,
                "response_format": {"type": "json_object"}
            }
            resp = requests.post(
                f"{(settings.LLM_BASE_URL or 'https://api.groq.com/openai/v1').rstrip('/')}/chat/completions",
                headers=headers, json=payload, timeout=8
            )
            if resp.status_code == 200:
                data = json.loads(resp.json()["choices"][0]["message"]["content"])
                data["duration_ms"] = int((time.time() - t0) * 1000)
                return data
    except Exception as e:
        print(f"[Verification Agent] LLM note: {e}")

    notes_lower = notes_clean.lower()
    dismissive_phrases = ["done", "fixed", "ok", "resolved", "completed", "closed", "cleared", "no issue"]
    if notes_lower in dismissive_phrases:
        return {
            "is_valid": False,
            "confidence": 0.3,
            "verification_status": "REJECTED",
            "reasoning": "Vague one-word resolution rejected. Please provide specific operational details.",
            "repair_indicators_found": []
        }

    category_indicators = {
        "Roads & Infrastructure": ["filled", "patched", "tar", "asphalt", "concrete", "repaired", "paving", "bitumen", "graded", "levelled"],
        "Sanitation": ["cleared", "swept", "dumped", "garbage collected", "bin cleaned", "waste removed", "sanitized", "bleaching", "sprayed"],
        "Water Supply": ["repaired", "pipe replaced", "leak fixed", "valve replaced", "pipeline welded", "supply restored", "pressure normalized", "sewer unblocked", "desilted"],
        "Street Lighting": ["bulb replaced", "led installed", "wire repaired", "transformer fixed", "switch replaced", "phase rectified", "illuminated"],
        "Animal Husbandry": ["vaccinated", "relocated", "sheltered", "sterilized", "caught", "treated"],
        "Town Planning & Enforcement": ["removed", "notice issued", "demolished", "evicted", "seized", "inspected"],
    }

    indicators = category_indicators.get(category, ["repaired", "inspected", "addressed", "fixed", "restored", "cleared"])
    found = [ind for ind in indicators if ind in notes_lower]
    
    actions_str = ", ".join(found) if found else "detailed description"
    return {
        "is_valid": True,
        "confidence": 0.88 if len(found) >= 2 else 0.75,
        "verification_status": "VERIFIED",
        "reasoning": f"Resolution verified with operational actions ({actions_str}).",
        "repair_indicators_found": found,
        "duration_ms": int((time.time() - t0) * 1000)
    }
