# Jan Setu — Roadmap to a Major-Project-Level System

This document describes where Jan Setu stands today and the concrete work that would
take it from a strong **intermediate** build to a **major-project / near-production**
system. Items are grouped by theme, each with *what*, *why it matters*, and a rough
*effort* estimate (S = hours, M = a few days, L = a week or more). A suggested
phase order is at the end.

---

## Where the project stands today

Already implemented and working offline:

- Four cooperating AI agents (intake, routing, tracking, communication) behind a
  state-machine orchestrator, with a full decision audit trail.
- Optional provider-agnostic LLM layer (OpenAI / Anthropic / Gemini) with transparent
  fallback to a keyword simulation.
- Autonomous background SLA scheduler (nudge at 75%, auto-escalate on breach).
- Voice intake (Deepgram STT/TTS + gTTS) over WebSocket.
- Five React dashboards: citizen portal, officer queue (with search), analytics admin
  (trends, department scorecard, officer leaderboard, system-health badges), and an
  AI agent monitor.
- Search + pagination, CSV export, and a guarded admin config/reset surface.
- Multilingual citizen communication (English / Hindi / Telugu / Urdu).

This is a complete, demonstrable vertical slice. The gaps below are what separate it
from a system you could actually deploy for a city.

---

## 1. Security, identity & access control  *(highest priority)*

The single biggest gap for a "major" system. Right now any client can call any
endpoint and act as any officer.

- **Authentication (JWT / OAuth2).** Add login for citizens, officers, and admins;
  issue signed tokens; protect every write endpoint. *Why: without identity there is
  no accountability, and the officer/admin dashboards are wide open.* **Effort: L**
- **Role-based access control (RBAC).** Citizen / Officer / Supervisor / Admin roles;
  officers see only their own or their department's cases. *Why: least-privilege is
  expected of any government system.* **Effort: M**
- **Rate limiting & input hardening.** Throttle submissions, cap payload sizes, and
  sanitize free text (the intake field is user-controlled and flows into the LLM).
  *Why: prevents abuse and prompt-injection into the LLM layer.* **Effort: M**
- **Audit log of human actions.** Persist who changed what and when (complements the
  existing AI `agent_logs`). *Why: traceability for disputes.* **Effort: S**
- **Secret management.** Move beyond `.env` to a vault / platform secrets in
  production; enforce key rotation (the previously-committed Deepgram key must be
  treated as compromised and rotated). **Effort: S**

## 2. Data layer & persistence

- **PostgreSQL + Alembic migrations.** Move off SQLite; add versioned schema
  migrations. *Why: concurrent writes, real deployment, and schema evolution without
  data loss.* **Effort: M**
- **Proper indexing.** Index `status`, `department_id`, `officer_id`, `created_at`,
  `sla_deadline` — the columns the new search/filter/sort endpoints hit. *Why:
  keeps list/search fast as volume grows.* **Effort: S**
- **File/attachment storage.** Store complaint photos in object storage (S3/MinIO)
  with size/type validation and generated thumbnails, instead of the local
  filesystem. **Effort: M**
- **Soft deletes & data retention policy.** *Why: government data-handling and the
  right to erasure.* **Effort: S**

## 3. Make the agents genuinely intelligent

The simulation is a great fallback, but a major project should show real ML/LLM depth.

- **Duplicate & hotspot detection.** Cluster incoming complaints by embedding
  similarity + location so recurring issues (e.g. the same pothole reported 20 times)
  are merged and prioritized. *Why: this is a real, visible win and a strong demo
  talking point.* **Effort: L**
- **Structured LLM extraction with validation.** Expand the LLM path to extract
  location, landmark, and urgency into structured fields with confidence, validated
  against the taxonomy (already scaffolded — deepen it). **Effort: M**
- **Image understanding.** Run a vision model on attached photos to confirm/augment
  the category (garbage vs. pothole vs. waterlogging). **Effort: M**
- **Feedback-driven learning loop.** Use officer corrections and citizen CSAT to
  fine-tune classification thresholds or few-shot examples over time. **Effort: L**
- **Confidence-based human-in-the-loop queue.** Route low-confidence classifications
  to a supervisor review lane instead of auto-assigning. **Effort: M**

## 4. Real notifications & citizen touchpoints

- **SMS / WhatsApp / email.** Send the acknowledgement and status updates the
  communication agent already generates through a real channel (Twilio / MSG91 /
  SMTP). *Why: closes the loop with citizens who don't sit on the web app.*
  **Effort: M**
- **Public tracking without login.** A lightweight "track by ID + phone" page. **Effort: S**
- **Digest emails for officers/supervisors.** Reuse the scheduler to send a daily
  "your overdue cases" summary. **Effort: S**

## 5. Geospatial & visualization

- **Map view.** Plot grievances on a Leaflet/Mapbox map; heatmap by ward; click a pin
  to open the case. *Why: turns the ward-volume bar chart into something a
  commissioner would actually use.* **Effort: M**
- **Reverse geocoding.** Convert the free-text location into coordinates and a ward
  automatically at intake. **Effort: M**

## 6. Testing, quality & CI

- **Backend test suite (pytest).** Unit tests for each agent, the orchestrator state
  machine, and the analytics helpers; API tests with a test client + fixture DB.
  *Why: a major project is expected to demonstrate correctness, and the state machine
  / SLA logic is exactly the kind of thing tests protect.* **Effort: M**
- **Frontend tests (Vitest + React Testing Library).** Cover the API client and key
  page interactions. **Effort: M**
- **CI pipeline (GitHub Actions).** Lint + test on every push; build the frontend.
  **Effort: S**
- **Type checking & linting.** `ruff`/`mypy` for Python, ESLint for the frontend.
  **Effort: S**

## 7. Observability & operations

- **Structured logging + request IDs.** Correlate a citizen request across all four
  agents. **Effort: S**
- **Metrics & health checks.** `/health` + Prometheus-style metrics (queue depth,
  agent latency, LLM fallback rate). **Effort: M**
- **Error tracking.** Sentry (or similar) for the frontend and backend. **Effort: S**

## 8. Deployment & packaging

- **Dockerize.** A `Dockerfile` for the backend, one for the frontend (build → nginx),
  and a `docker-compose.yml` wiring app + Postgres. *Why: one-command reproducible
  setup for graders and deployers.* **Effort: M**
- **Environment configs.** Separate dev / staging / prod settings; serve the built
  frontend behind the API or a reverse proxy. **Effort: S**
- **Backup & restore scripts** for the database. **Effort: S**

## 9. Scale & robustness

- **Async agent execution / task queue.** Move the AI pipeline onto a background
  worker (Celery/RQ or FastAPI background tasks + a broker) so submission returns
  instantly and heavy LLM/vision work runs off the request path. *Why: keeps the API
  responsive under load.* **Effort: L**
- **Caching.** Cache analytics aggregates (they recompute on every dashboard load).
  **Effort: S**
- **Pagination everywhere.** The officer dashboard currently pulls up to 100 rows
  client-side; switch it to the new server-side `/search` endpoint. **Effort: S**

## 10. Product depth (nice-to-have, high demo value)

- **Citizen accounts & history** — see all my past complaints. **Effort: M**
- **Officer mobile PWA** — field officers update status from a phone. **Effort: L**
- **Supervisor escalation console** — a dedicated view for escalated cases. **Effort: M**
- **Configurable SLA matrix** — edit per-category SLA hours from the admin UI instead
  of code. **Effort: M**
- **Multi-tenant / multi-city** — parameterize the GHMC taxonomy so another city can
  be onboarded. **Effort: L**

---

## Suggested phasing

**Phase 1 — Make it real and safe (foundation).**
Auth + RBAC, PostgreSQL + migrations + indexes, Docker Compose, a backend test suite
and CI. After this the app is deployable and trustworthy.

**Phase 2 — Make it useful in the field.**
Real notifications (SMS/email), map view + geocoding, async task queue, public
track-by-ID page. After this it delivers end-to-end value to citizens and officers.

**Phase 3 — Make the AI stand out.**
Duplicate/hotspot clustering, image understanding, human-in-the-loop review queue,
and the feedback-driven learning loop. This is the differentiated, "wow" layer for a
major-project defense.

**Phase 4 — Polish & scale.**
Observability, caching, metrics, mobile PWA, multi-tenant support.

---

## What to say in a project defense

The story that ties this together: *Jan Setu already demonstrates an autonomous,
multi-agent pipeline end to end and degrades gracefully with no external
dependencies.* Phase 1 makes it a **deployable** system; Phase 2 makes it a
**usable** one; Phase 3 is where the **AI research contribution** (duplicate
clustering, vision, human-in-the-loop, learning loop) becomes the centerpiece. Being
explicit about this progression — and about the deliberate offline-first, fallback
design — shows engineering judgment, not just feature count.
