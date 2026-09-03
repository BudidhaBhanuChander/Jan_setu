# Jan Setu — AI-Powered Municipal Grievance Redressal System

**Jan Setu** ("People's Bridge") is a multi-agent AI system for municipal grievance
redressal, modelled on the GHMC (Greater Hyderabad Municipal Corporation) workflow.
Citizens file complaints in natural language (typed or spoken, in multiple languages);
four cooperating AI agents classify, route, track, and communicate — end to end —
while officers and administrators work from live dashboards.

The entire system **runs offline in demo mode with zero API keys**. Optional real
LLM and voice layers switch on automatically when keys are configured.

---

## Table of contents

1. [Key features](#key-features)
2. [Architecture](#architecture)
3. [The four AI agents](#the-four-ai-agents)
4. [Tech stack](#tech-stack)
5. [Quick start](#quick-start)
6. [Configuration (.env)](#configuration-env)
7. [Enabling the optional LLM layer](#enabling-the-optional-llm-layer)
8. [Enabling the voice agent](#enabling-the-voice-agent)
9. [API reference](#api-reference)
10. [Project structure](#project-structure)
11. [Demo script](#demo-script)
12. [Troubleshooting](#troubleshooting)
13. [Roadmap](#roadmap)

---

## Key features

- **Multi-agent pipeline** — Intake → Routing → Tracking → Communication, coordinated
  by a state-machine orchestrator with a full audit trail of every agent decision.
- **Natural-language intake** — free-text complaints are classified into department,
  sub-category, severity, and sentiment, with entity extraction.
- **Smart routing** — category→department mapping plus least-loaded, zone-aware officer
  assignment and severity-based SLA deadlines.
- **Autonomous SLA monitoring** — a background scheduler nudges officers at 75% of the
  SLA window and auto-escalates on breach, with no human trigger required.
- **Resolution verification** — the tracking agent checks that an officer's resolution
  note actually addresses the original complaint before closing it.
- **Citizen communication** — multilingual (English / Hindi / Telugu / Urdu)
  acknowledgements, status updates, and feedback-driven reopening.
- **Voice agent** — speech-to-text and text-to-speech conversational intake over
  WebSocket (Deepgram + gTTS), when a key is configured.
- **Live dashboards** — a citizen portal, officer work queue with search, an analytics
  admin dashboard (trends, category/severity/status/ward breakdowns, department
  performance, officer leaderboard), and an AI agent activity monitor.
- **Reporting** — one-click CSV export of all grievances for offline analysis.
- **Optional real LLM** — provider-agnostic (OpenAI / Anthropic / Gemini) layer that
  transparently falls back to the built-in keyword simulation when no key is present.

---

## Architecture

```
                        ┌──────────────────────────────────────────────┐
   Citizen (Web / Voice)│                  FRONTEND (React)              │
        │               │  Citizen Portal · Officer Dashboard · Admin    │
        │               │  Analytics · Agent Monitor · Voice Agent       │
        ▼               └───────────────────────┬────────────────────────┘
   ┌─────────┐                                   │ REST / WebSocket (/api)
   │  FastAPI │◄──────────────────────────────────┘
   │  routers │
   └────┬─────┘
        │  process_new_grievance()
        ▼
   ┌───────────────────────  ORCHESTRATOR (state machine)  ───────────────────────┐
   │  NEW → CLASSIFIED → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED                 │
   │                         ↘ ESCALATED ↗        ↘ REOPENED ↗                      │
   │                                                                               │
   │   ① Intake Agent  →  ② Routing Agent  →  ④ Communication Agent (ack)          │
   │                                                                               │
   │   ③ Tracking Agent  ← runs continuously (background SLA scheduler)            │
   └───────────────────────────────────────┬───────────────────────────────────────┘
                                            ▼
                                   ┌──────────────────┐
                                   │  SQLite (SQLAlchemy) │
                                   │  grievances, officers,│
                                   │  departments, events, │
                                   │  escalations, logs     │
                                   └──────────────────┘

   Agents call the optional LLM layer when configured; otherwise they use the
   built-in keyword simulation. Either way the pipeline behaves identically.
```

A deeper design write-up lives in [`docs/ai-grievance-architecture.md`](docs/ai-grievance-architecture.md).

---

## The four AI agents

| # | Agent | Responsibility | Simulation logic | LLM logic (optional) |
|---|-------|----------------|------------------|----------------------|
| 1 | **Intake & Classification** | Category, sub-category, severity, sentiment, entities | Weighted keyword scoring over a GHMC taxonomy | Structured JSON classification validated against the taxonomy |
| 2 | **Routing & Assignment** | Department mapping, officer selection, SLA + priority | Category→dept map + least-loaded, zone-aware officer | *(deterministic; LLM not required)* |
| 3 | **Resolution Tracking & Escalation** | SLA monitoring, nudges, escalation, proof verification | Threshold checks + keyword-overlap proof check | LLM judges whether the resolution note addresses the complaint |
| 4 | **Citizen Communication** | Acknowledgement, status updates, feedback analysis | Multilingual templates + CSAT rules | *(templates; LLM optional for future free-form replies)* |

Every agent writes to the `agent_logs` table, so the Agent Monitor page shows exactly
what each agent decided, its confidence, and how long it took — including whether the
`llm` or `simulation` engine produced the result.

---

## Tech stack

**Backend:** Python 3.10+, FastAPI, SQLAlchemy 2.x, Pydantic 2.x, SQLite, Uvicorn.
**Frontend:** React 18, Vite 5, Axios, Chart.js + react-chartjs-2, lucide-react.
**Optional:** Deepgram SDK + gTTS (voice), OpenAI / Anthropic / Gemini (LLM).

---

## Quick start

You need **Python 3.10+** and **Node.js 18+**.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Seed the database with realistic GHMC-style sample data (recommended):
python seed_data.py

# Run the API (http://localhost:8000, interactive docs at /docs):
uvicorn main:app --reload
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api` (REST **and** WebSocket) to the backend on port
8000, so no CORS or extra config is needed for local development.

### 3. Open the app

Visit **http://localhost:5173** and try the flow in the [Demo script](#demo-script).

> **Nothing to configure.** With no `.env` file the AI agents use the keyword
> simulation, voice is disabled, and the SLA scheduler is off — everything else works.

---

## Configuration (.env)

Copy `backend/.env.example` to `backend/.env` and set only what you need. Every value
has a safe default.

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///./jan_setu.db` | SQLAlchemy database URL |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins (use explicit origins in prod) |
| `DEEPGRAM_API_KEY` | *(empty)* | Enables the voice agent |
| `STT_MODEL` / `TTS_MODEL` | `nova-3` / `aura-2-asteria-en` | Deepgram models |
| `LLM_PROVIDER` | `none` | `none` \| `openai` \| `anthropic` \| `gemini` |
| `LLM_API_KEY` | *(empty)* | Key for the chosen provider |
| `LLM_MODEL` | provider default | e.g. `gpt-4o-mini`, `claude-3-5-haiku-latest`, `gemini-1.5-flash` |
| `LLM_BASE_URL` | *(empty)* | Custom base URL for OpenAI-compatible gateways |
| `LLM_TIMEOUT` | `20` | LLM request timeout (seconds) |
| `SLA_SCHEDULER_ENABLED` | `false` | Turn on the autonomous SLA monitor |
| `SLA_CHECK_INTERVAL_MINUTES` | `15` | How often the monitor sweeps (min 0.5) |
| `ALLOW_ADMIN_RESET` | `false` | Allow `POST /api/admin/reset` to re-seed the DB |

> **Security:** never commit a real `.env`. It is git-ignored. API keys are only ever
> read from the environment and are **never** returned by any endpoint (the
> `/api/admin/config` health endpoint reports capability flags only).

---

## Enabling the optional LLM layer

The agents work fully without an LLM. To use a real model instead of the keyword
simulation, set three variables in `backend/.env`:

```env
LLM_PROVIDER=openai            # or anthropic / gemini
LLM_API_KEY=sk-...             # your key
LLM_MODEL=gpt-4o-mini          # optional; sensible per-provider default otherwise
```

Restart the backend. Intake classification and resolution verification will now use
the model, and the Agent Monitor will show `engine: llm`. If a request fails or times
out, the agent silently falls back to the simulation for that call — the app never
breaks because of the LLM.

---

## Enabling the voice agent

Set `DEEPGRAM_API_KEY` in `backend/.env` and restart. The Voice Agent page then
streams microphone audio to the backend over WebSocket, transcribes it (Deepgram STT),
runs the same intake pipeline, and speaks responses back (Deepgram TTS for English,
gTTS for Hindi/Telugu). Without a key the page reports that voice is disabled and the
rest of the app is unaffected.

---

## API reference

Interactive OpenAPI docs are always available at **http://localhost:8000/docs**.

### Grievances
- `POST /api/grievances/` — submit a grievance (runs the full AI pipeline)
- `GET /api/grievances/` — list with filters (`status`, `category`, `severity`,
  `department_id`, `officer_id`), free-text `q`, `sort_by`, `order`, `skip`, `limit`;
  total count returned in the `X-Total-Count` header
- `GET /api/grievances/search` — paginated `{total, skip, limit, items}` envelope
- `GET /api/grievances/{tracking_id}` — full detail incl. events & escalations
- `PATCH /api/grievances/{tracking_id}/status` — update status (state-machine validated)
- `POST /api/grievances/{tracking_id}/feedback` — submit CSAT (1–5) + comment
- `GET /api/grievances/{tracking_id}/sla` — live SLA status
- `POST /api/grievances/sla/check-all` — trigger one escalation sweep

### Analytics
- `GET /api/analytics/overview` — KPI summary
- `GET /api/analytics/by-category` · `by-severity` · `by-status` · `by-ward`
- `GET /api/analytics/by-department` — per-department scorecard
- `GET /api/analytics/officer-performance` — officer leaderboard
- `GET /api/analytics/public-stats` — non-sensitive citizen-facing stats
- `GET /api/analytics/trend?days=7` — submitted vs resolved time series
- `GET /api/analytics/export.csv` — stream all grievances as CSV
- `GET /api/analytics/agent-logs` — AI decision audit trail

### Officers / Departments
- `GET /api/officers/` · `GET /api/officers/{id}`
- `GET /api/departments/`

### Admin
- `GET /api/admin/config` — runtime health (LLM mode, voice, scheduler, counts)
- `POST /api/admin/sla/run-now` — manual escalation sweep
- `POST /api/admin/reset` — wipe & re-seed (guarded by `ALLOW_ADMIN_RESET`)

### Voice
- `WS /api/voice/ws` — streaming voice conversation (when enabled)

---

## Project structure

```
Jan_setu/
├── backend/
│   ├── main.py               # FastAPI app, lifespan, router wiring
│   ├── config.py             # env-driven settings (+ stdlib .env loader)
│   ├── database.py           # SQLAlchemy engine + ORM models
│   ├── models.py             # Pydantic request/response schemas
│   ├── orchestrator.py       # grievance state machine, agent coordination
│   ├── scheduler.py          # autonomous background SLA monitor
│   ├── seed_data.py          # realistic GHMC-style demo data
│   ├── agents/
│   │   ├── intake_agent.py         # ① classification
│   │   ├── routing_agent.py        # ② routing & assignment
│   │   ├── tracking_agent.py       # ③ SLA + resolution verification
│   │   ├── communication_agent.py  # ④ citizen comms
│   │   ├── voice_agent.py          # Deepgram STT/TTS conversation
│   │   ├── translations.py         # multilingual templates
│   │   └── llm.py                  # optional provider-agnostic LLM client
│   ├── routers/              # grievances, officers, departments, analytics, admin, voice
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── pages/            # CitizenPortal, OfficerDashboard, AdminDashboard, AgentMonitor, VoiceAgent
│   │   ├── components/       # Header, Sidebar, StatCard, StatusBadge, Toast, AgentPipeline
│   │   ├── api.js            # Axios API client
│   │   └── App.jsx / main.jsx / index.css
│   ├── package.json
│   └── vite.config.js
├── docs/ai-grievance-architecture.md
├── README.md
└── ROADMAP.md
```

---

## Demo script

A five-minute walkthrough that shows the whole system:

1. **Seed & launch** — `python seed_data.py`, start both servers, open the app.
2. **File a complaint** (Citizen Portal) — e.g. *"There's a huge pothole near
   Ameerpet junction that's been causing accidents for weeks."* Watch it get a tracking
   ID, category (Roads & Infrastructure), severity, and an assigned officer instantly.
3. **Track it** — switch to the Track tab; the tracking ID is pre-filled. See the AI
   pipeline timeline and SLA countdown.
4. **Work it** (Officer Dashboard) — search for the case, Start Work, then Resolve with
   a note. The tracking agent verifies the note matches the complaint.
5. **Watch the agents** (Agent Monitor) — every decision is logged with confidence,
   duration, and engine (simulation/LLM).
6. **See the analytics** (Admin Dashboard) — trends, department performance, officer
   leaderboard, and the system-health badges. Click **Export CSV**.
7. **Autonomy** — set `SLA_SCHEDULER_ENABLED=true`, restart, and show breaches being
   auto-escalated with no human action (or hit **Run SLA Check**).

To reset between runs, set `ALLOW_ADMIN_RESET=true` and `POST /api/admin/reset`
(or just re-run `python seed_data.py`).

---

## Troubleshooting

- **Frontend can't reach the API** — make sure the backend is running on port 8000;
  the Vite proxy targets `http://localhost:8000`.
- **`ModuleNotFoundError`** — activate the virtualenv and re-run
  `pip install -r requirements.txt`.
- **Voice page says disabled** — set `DEEPGRAM_API_KEY` and restart the backend.
- **Empty dashboards** — run `python seed_data.py`.
- **Want a clean slate** — delete `backend/jan_setu.db` and re-seed.

---

## Roadmap

See [`ROADMAP.md`](ROADMAP.md) for the concrete path from this intermediate build to a
full major-project / production-grade system (auth & RBAC, PostgreSQL + migrations,
async agents, real notifications, duplicate clustering, geospatial maps, mobile app,
containerized deploy, and tests/CI).
