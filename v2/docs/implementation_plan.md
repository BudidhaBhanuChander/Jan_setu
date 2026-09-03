# Jan Setu V2: Enterprise GHMC Architecture Plan

This document outlines the complete architectural overhaul for **Jan Setu V2**, designed as a production-grade, true agentic system ready to be pitched to the Greater Hyderabad Municipal Corporation (GHMC).

## 1. Core Objectives & Tech Stack

*   **Frontend:** React.js (Vite) + Tailwind CSS + Leaflet/React-Map-GL (Maps). *We will strictly use JS/React for the frontend, ensuring a snappy, modern UI.*
*   **Backend:** FastAPI (Python) for high performance.
*   **Database:** PostgreSQL (Relational data, Users, Roles) + ChromaDB/pgvector (Vector database for RAG & duplicate detection).
*   **AI/LLM Engine:** Groq (Llama 3.3 70B) for instant reasoning.
*   **Orchestration:** LangGraph for stateful, multi-agent workflows.
*   **Authentication:** JWT (JSON Web Tokens) with Role-Based Access Control (RBAC).

---

## 2. Comprehensive Grievance Workflow

The lifecycle of a grievance will flow through a LangGraph `StateGraph`, transitioning between specialized AI agents and human roles.

### Stage 1: Multimodal Intake (Citizen)
1. **Submission:** Citizen submits a grievance via Voice Agent (Deepgram STT), Text, or Web Form.
2. **Media Upload:** Citizen uploads images of the issue (e.g., a pothole).
3. **Agent 1: Intake & Vision Agent**
    *   *Action:* Parses text/voice. If an image is provided, a Vision LLM analyzes the image to verify the claim (e.g., "Yes, this is a deep pothole").
    *   *Action:* Embeds the grievance text into ChromaDB to check for semantic duplicates (e.g., "Has someone else reported this exact pothole?").

### Stage 2: Agentic Routing & SLA Assignment
1. **Agent 2: Routing Agent (LangGraph Node)**
    *   *Action:* Analyzes the classification and uses **RAG** (Retrieval-Augmented Generation) against a GHMC Rulebook PDF to determine the exact department (e.g., Town Planning, Sanitation, Water Works).
    *   *Action:* Calculates the SLA (Service Level Agreement) deadline based on severity (e.g., High Severity = 24 hours).
2. **Assignment:** Assigns to the Level 1 (L1) Ward Officer for that specific geospatial area.

### Stage 3: Resolution & Proof of Work (Official)
1. **Field Action:** The assigned L1 Officer receives a notification.
2. **Verification:** Officer visits the site, fixes the issue, and **uploads a resolution image**.
3. **Agent 3: QA & Verification Agent**
    *   *Action:* Cross-checks the officer's resolution image against the citizen's original image to ensure the problem was actually fixed, preventing false closures.

### Stage 4: Hierarchical Escalation (Automated)
*   **Agent 4: Watchdog Agent** (Runs as a background cron job)
    *   *Action:* Monitors all active grievances. If the L1 Officer breaches the 24-hour SLA, the AI automatically escalates the ticket to the L2 Zonal Commissioner, and sends a warning notification.

### Stage 5: Customer Service & Feedback Loop (Closure)
1. **Agent 5: Outbound Communication Agent**
    *   *Action:* Once marked resolved, the AI triggers a "Call-back action" or SMS to the citizen: *"Your issue JS-102 has been marked resolved. Are you satisfied?"*
2. **Citizen Feedback:**
    *   If **Yes**: Ticket is permanently closed.
    *   If **No**: Ticket is re-opened, flagged as "Quality Failure", and escalated directly to L2 for manual review.

---

## 3. User Roles & Authentication Mapping

A robust JWT-based system will isolate views based on roles:

1. **Citizen (Public Role):**
    *   Can file grievances, view their own dashboard, talk to the Voice AI, and track status.
2. **L1 Grievance Officer (Field Worker):**
    *   Dashboard shows only tickets assigned to their specific Ward & Department. Can upload resolution images and mark as "Resolved".
3. **L2 Zonal Commissioner (Middle Management):**
    *   Dashboard shows aggregated analytics for their zone. Can see escalated (SLA breached) tickets and penalize officers.
4. **GHMC Admin / Mayor (Executive Role):**
    *   God-view. Access to city-wide interactive Heatmaps (GIS), predictive analytics, and department performance reports.

---

## 4. Suggested "Wow Factor" Features for the GHMC Pitch

To guarantee satisfaction and secure the pitch, we will add these advanced features:

*   **Geospatial Heatmaps (Maps):** A live React-Map-GL dashboard showing red/orange/green zones across Hyderabad based on grievance density.
*   **Multilingual Semantic Search:** A citizen can search past public complaints in Telugu, and the Vector DB will return matching complaints originally filed in English or Hindi.
*   **Predictive Maintenance Analytics:** The AI analyzes historical data to warn officials: *"Alert: 40% increase in waterlogging complaints in Uppal this week. Suggesting preventative drain clearing."*
*   **Fake Complaint Filtering:** The Intake Agent flags grievances as "Spam/Fake" if the uploaded image is pulled from the internet or if the text makes no logical sense, saving officer time.

---

## 5. Execution Strategy

We will build this V2 in the following phases to ensure stability:

*   **Phase 1: Database & Auth Overhaul.** Set up PostgreSQL, ChromaDB, and JWT login with Role mapping.
*   **Phase 2: LangGraph Core.** Build the true agentic `StateGraph` in Python, wiring up Groq LLM for real reasoning.
*   **Phase 3: The React Frontend.** Build the Official Dashboards, Map Integrations, and Image Upload components in React.js.
*   **Phase 4: Feedback Loop & Escalation.** Implement the background tasks for SLA monitoring and the QA verification steps.

## User Review Required

> [!IMPORTANT]
> Please review this V2 Architecture Plan. This is a massive leap from the current codebase. If you approve, I will begin **Phase 1 (Database & Auth)** by setting up the new database models, user roles, and JWT security on the backend.
