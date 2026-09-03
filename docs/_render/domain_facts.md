# Jan Setu — canonical domain facts for diagram authors

Every diagram in `docs/diagrams/` and every wireframe in `docs/wireframes/` must
agree with this sheet. It was extracted from the running code (`backend/database.py`,
`backend/orchestrator.py`, `backend/agents/*.py`, `backend/routers/*.py`) plus the
designed additions marked **[planned]**.

Do not invent entity names, statuses or endpoints that are not listed here.

---

## 1. Actors / roles

| Role | Code value | Does |
|---|---|---|
| Citizen | `CITIZEN` | submits, tracks, confirms "me too", rates, reopens, browses public map |
| Field Officer (L1) | `OFFICER` | works assigned queue, updates progress, uploads resolution proof |
| Supervisor (L2) | `SUPERVISOR` | reviews low-confidence AI output, handles escalations, reassigns |
| Department Head | `DEPT_HEAD` | ward + officer performance, audit ledger |
| System Administrator | `ADMIN` | SLA matrix, users & roles, reset/reseed, agent monitor |

## 2. The four AI agents (and the orchestrator)

| Agent | Module | Responsibility | Writes |
|---|---|---|---|
| Intake / Classification | `agents/intake_agent.py` | language detect, category + sub-category, severity, sentiment, spam, duplicate hash, confidence | `category, sub_category, severity, sentiment, classification_confidence, duplicate_cluster_id, extracted_entities` |
| Routing / Assignment | `agents/routing_agent.py` | category→department, least-loaded officer in ward, SLA deadline, priority | `department_id, assigned_officer_id, priority, sla_deadline, routing_confidence` |
| Tracking / Escalation | `agents/tracking_agent.py` | SLA countdown, breach detection, escalation level bump | `escalation_level, status`, rows in `escalations` |
| Communication | `agents/communication_agent.py` | citizen-facing message text in the citizen's language | notification payloads |
| Orchestrator | `orchestrator.py` | owns `VALID_TRANSITIONS`, calls agents in order, writes `status_events` + `agent_logs`, keeps `User.current_load` correct | `status`, `status_events`, `agent_logs` |
| LLM layer | `agents/llm.py` | provider-agnostic HTTP call (OpenAI / Anthropic / Gemini / Groq-via-OpenAI-compat); **falls back to keyword rules when no API key** | — |
| Scheduler | `scheduler.py` | background loop that runs the tracking agent on a timer (config-gated) | — |

Agent-log `agent_name` values in use: `intake`, `routing`, `tracking`, `communication`.

## 3. Data model (SQLAlchemy, `backend/database.py`)

```
departments (id, name*, code*, description)
zones       (id, name, ward_number, city='Hyderabad')
users       (id, username*, hashed_password, name, role='CITIZEN',
             department_id→departments, zone_id→zones,
             current_load=0, preferred_language='en')
grievances  (id, tracking_id*, citizen_id→users,
             raw_text, channel='WEB', language='en',
             has_image, image_path, location_text, latitude, longitude, ward_id→zones,
             category, sub_category, severity='MEDIUM', sentiment='NEUTRAL',
             duplicate_cluster_id, classification_confidence, extracted_entities(JSON text),
             department_id→departments, assigned_officer_id→users,
             priority=3, sla_deadline, routing_confidence, escalation_level=0,
             status='NEW', resolution_notes, resolution_image,
             csat_score, feedback_comment,
             created_at, updated_at, resolved_at, closed_at)
status_events (id, grievance_id→grievances, from_status, to_status,
             actor='SYSTEM', agent_name, note, evidence_url,
             ai_confidence, ai_reasoning, timestamp)
escalations (id, grievance_id→grievances, level=1, reason, escalated_to,
             breach_predicted, is_resolved, created_at)
agent_logs  (id, grievance_id→grievances, tracking_id, agent_name, action,
             input_summary, output_summary, confidence, reasoning,
             duration_ms, status='SUCCESS', timestamp)
```
`*` = unique. Cardinalities: Department 1—* User; Zone 1—* User; Zone 1—* Grievance
(as ward); User(citizen) 1—* Grievance; User(officer) 1—* Grievance (assigned);
Department 1—* Grievance; Grievance 1—* StatusEvent; Grievance 1—* Escalation;
Grievance 1—* AgentLog.

**[planned]** `media (id, grievance_id, kind, path, sha256, exif_lat, exif_lng, taken_at)`
and `duplicate_links (id, grievance_id, master_id, similarity)` for the me-too /
semantic-dedup features.

## 4. Status machine (`orchestrator.VALID_TRANSITIONS`) — copy exactly

```
NEW         → CLASSIFIED
CLASSIFIED  → ASSIGNED | CLOSED
ASSIGNED    → IN_PROGRESS | RESOLVED | ESCALATED
IN_PROGRESS → RESOLVED | ESCALATED
RESOLVED    → CLOSED | REOPENED
CLOSED      → (terminal)
ESCALATED   → IN_PROGRESS | RESOLVED | CLOSED
REOPENED    → CLASSIFIED | ASSIGNED | IN_PROGRESS
```
Officer workload is held while status ∈ {ASSIGNED, IN_PROGRESS, ESCALATED, REOPENED}.

## 5. Taxonomy → department → SLA

| Category | Default severity | Department |
|---|---|---|
| Sanitation | MEDIUM | Sanitation & Solid Waste |
| Roads & Infrastructure | HIGH | Roads & Infrastructure |
| Water Supply | HIGH | Water Supply & Sewerage |
| Street Lighting | LOW | Electrical & Lighting |
| Encroachment | MEDIUM | Town Planning & Enforcement |
| Stray Animals | HIGH | Animal Husbandry |
| Building & Construction | HIGH | Town Planning & Enforcement |
| Noise Pollution | LOW | Environmental & Pollution Control |
| Other | LOW | Public Relations |

SLA hours by severity: `CRITICAL 4h · HIGH 24h · MEDIUM 48h · LOW 96h`.
Priority by severity: `CRITICAL 1 · HIGH 2 · MEDIUM 3 · LOW 4`.

Sub-categories (use only if you need them): Sanitation → Garbage Collection, Solid
Waste, Drain Cleaning, Public Toilet, Street Sweeping. Roads → Pothole, Road Damage,
Footpath, Flyover, Speed Breaker, Road Marking. Water Supply → No Water Supply, Water
Leakage, Water Quality, Pipeline Damage, Meter Issue. Street Lighting → Light Not
Working, New Light Required, Light Flickering, Pole Damage.

## 6. HTTP surface (real, 27 endpoints)

```
POST   /api/grievances/                      submit  (multipart: text, image, lat/lng, ward)
GET    /api/grievances/                      list    (filters + pagination)
GET    /api/grievances/search                full-text search + pagination
GET    /api/grievances/{tracking_id}         detail  (+ events, escalations)
PATCH  /api/grievances/{tracking_id}/status  officer/supervisor transition
POST   /api/grievances/{tracking_id}/feedback  CSAT + comment
GET    /api/grievances/{tracking_id}/sla     countdown
POST   /api/grievances/sla/check-all         manual tracking-agent sweep

GET    /api/analytics/overview | by-category | by-severity | by-status | by-ward
GET    /api/analytics/trend | officer-performance | by-department | public-stats
GET    /api/analytics/export.csv | agent-logs

POST   /api/auth/signup | /api/auth/token        GET /api/auth/me
GET    /api/departments/    GET /api/officers/   GET /api/officers/{id}
GET    /api/admin/config    POST /api/admin/sla/run-now   POST /api/admin/reset
GET    /api/voice/status    WS  /api/voice/stream   (Deepgram-backed voice agent)
```

## 7. Frontend screens (real)

`CitizenPortal.jsx` · `OfficerDashboard.jsx` · `AdminDashboard.jsx` ·
`AgentMonitor.jsx` · `VoiceAgent.jsx` (React 18 + Vite, axios, chart.js, lucide-react).

**[planned]** public transparency map, supervisor review queue, officer grievance detail.

## 8. External systems (never actors in the use case diagram)

Groq / OpenAI-compatible LLM API · Deepgram STT + gTTS · SMS / WhatsApp gateway ·
OpenStreetMap tiles · SQLite (dev) / PostgreSQL (**[planned]** prod).
