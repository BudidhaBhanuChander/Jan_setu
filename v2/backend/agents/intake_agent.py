"""
intake_agent.py � LangChain + Groq implementation for V2
"""
import time
import os
from pydantic import BaseModel, Field
from typing import Optional, Literal
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from database import Grievance
from vector_store import find_duplicate

class GrievanceClassification(BaseModel):
    category: str = Field(description="The category of the grievance (e.g. 'Roads & Infrastructure', 'Sanitation', etc)")
    sub_category: str = Field(description="The sub-category of the grievance")
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(description="The severity level of the grievance")
    sentiment: Literal["POSITIVE", "NEUTRAL", "NEGATIVE", "ANGRY"] = Field(description="The sentiment of the citizen")
    is_spam: bool = Field(description="True if the message is spam, greeting, or irrelevant to civic issues")

def get_llm():
    from config import settings
    api_key = settings.LLM_API_KEY or os.getenv("GROQ_API_KEY", "")
    model = settings.LLM_MODEL or "qwen/qwen3.8-27b"
    return ChatGroq(temperature=0, model_name=model, api_key=api_key)

def run(grievance_text: str, language: str, db) -> dict:
    t0 = time.time()
    
    # 1. Semantic Duplicate Detection via ChromaDB
    duplicate_cluster_id = find_duplicate(grievance_text, threshold=0.3)
    
    try:
        from config import settings
        import requests
        import json
        
        api_key = settings.LLM_API_KEY or os.getenv("GROQ_API_KEY", "")
        model = settings.LLM_MODEL or "qwen/qwen3.8-27b"
        base_url = (settings.LLM_BASE_URL or "https://api.groq.com/openai/v1").rstrip("/")
        
        system_msg = (
            "You are an AI Intake Agent for GHMC (Greater Hyderabad Municipal Corporation). "
            "Classify citizen complaints into JSON with fields: category, sub_category, severity (LOW|MEDIUM|HIGH|CRITICAL), "
            "sentiment (POSITIVE|NEUTRAL|NEGATIVE|ANGRY), is_spam (boolean). "
            "Allowed categories: ['Roads & Infrastructure', 'Sanitation', 'Water Supply', 'Street Lighting', "
            "'Town Planning & Enforcement', 'Public Health & Vector Control', 'Animal Husbandry', 'Other']. "
            "Respond ONLY with valid JSON."
        )
        user_msg = f"Language: {language}\nComplaint: {grievance_text}"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        
        resp = requests.post(f"{base_url}/chat/completions", headers=headers, json=payload, timeout=8)
        if resp.status_code == 200:
            parsed = json.loads(resp.json()["choices"][0]["message"]["content"])
            return {
                "category": parsed.get("category", "General"),
                "sub_category": parsed.get("sub_category", "General Civic Issue"),
                "severity": parsed.get("severity", "MEDIUM"),
                "sentiment": parsed.get("sentiment", "NEUTRAL"),
                "is_spam": parsed.get("is_spam", False),
                "duplicate_info": {"cluster_id": duplicate_cluster_id} if duplicate_cluster_id else None,
                "duration_ms": int((time.time() - t0) * 1000)
            }
        else:
            raise Exception(f"HTTP {resp.status_code}: {resp.text[:150]}")
    except Exception as e:
        print(f"LLM Intake notice: {e}. Running deterministic NLP classifier.")
        
        # Robust keyword classification fallback
        text_lower = grievance_text.lower()
        category = "Other"
        sub_cat = "General"
        severity = "MEDIUM"

        if any(w in text_lower for w in ["pothole", "road", "footpath", "flyover", "divider", "asphalt", "crater"]):
            category = "Roads & Infrastructure"
            sub_cat = "Pothole & Surface Repair"
            severity = "HIGH"
        elif any(w in text_lower for w in ["water", "leak", "pipeline", "pipe", "drinking water", "supply", "tap"]):
            category = "Water Supply"
            sub_cat = "Pipeline & Supply Redressal"
        elif any(w in text_lower for w in ["garbage", "trash", "waste", "dustbin", "dump", "debris", "litter"]):
            category = "Sanitation"
            sub_cat = "Solid Waste Collection"
        elif any(w in text_lower for w in ["light", "dark", "lamp", "pole", "wire", "sparking", "transformer", "power"]):
            category = "Street Lighting"
            sub_cat = "Street Lights & Power"
        elif any(w in text_lower for w in ["drain", "sewage", "gutter", "manhole", "overflow", "stink"]):
            category = "Water Supply"
            sub_cat = "Drainage & Sewerage"
        elif any(w in text_lower for w in ["dog", "cat", "monkey", "cattle", "animal", "rabies", "barking", "bite"]):
            category = "Animal Husbandry"
            sub_cat = "Stray Animal Control"
        elif any(w in text_lower for w in ["encroachment", "illegal", "construction", "building", "demolition", "land"]):
            category = "Town Planning & Enforcement"
            sub_cat = "Encroachment Removal"
        elif any(w in text_lower for w in ["mosquito", "dengue", "malaria", "fogging", "fever", "epidemic", "hospital"]):
            category = "Public Health & Vector Control"
            sub_cat = "Vector Control & Sanitation"
        
        return {
            "category": category,
            "sub_category": sub_cat,
            "severity": severity,
            "sentiment": "NEGATIVE",
            "is_spam": False,
            "duplicate_info": {"cluster_id": duplicate_cluster_id} if duplicate_cluster_id else None,
            "duration_ms": int((time.time() - t0) * 1000)
        }
