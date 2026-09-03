# Jan Setu V2 — Plan Review & Additional Features

A review of `implementation_plan.md` and `mentorship_review.md` against the code as it
actually stands on 2026-09-02, followed by what to add beyond that plan to reach
major-project level.

---

## Part 1 — Verdict: are we using LangGraph effectively?

**No.** It is installed and invoked, but used as a linear function-call chain. Nothing
that justifies adopting LangGraph is present.

Evidence from the code:

| Finding | Location |
|---|---|
| `backend/agents/graph.py` (v1 tree) is **never imported by anything** — dead code; the live v1 pipeline is still procedural `orchestrator.py` | `backend/agents/graph.py:119` |
| v2 graph **is** invoked — good, that part is real | `v2/backend/orchestrator.py:51` |
| …but it has only 2 nodes (`intake_node` → `routing_node`) and one conditional edge that merely short-circuits to `END`. No cycles. A chain, not a graph | `v2/backend/agents/graph.py:50-60` |
| **No checkpointer anywhere** (`MemorySaver`/`SqliteSaver`/Postgres saver). No durable state, no resume-after-crash, no time-travel replay | `grep checkpoint` → 0 hits, whole repo |
| **No `interrupt()`** → no human-in-the-loop. This is LangGraph's headline capability | `grep interrupt` → 0 hits |
| **No LangGraph-native tool calling** — no `ToolNode`, `bind_tools`, or `create_react_agent`. (There *is* a hand-rolled OpenAI function-calling loop in `voice_agent.py` — see the note below.) | `grep bind_tools\|ToolNode` → 0 hits |
| **`db_session` is stored inside the graph state.** A live SQLAlchemy `Session` is not serializable, so this *architecturally forecloses* ever adding a checkpointer | `v2/backend/agents/state.py:17` |
| The DB write happens in the orchestrator *after* the graph returns, so ~30 lines manually copy state → ORM fields. A `persist_node` inside the graph would remove that | `v2/backend/orchestrator.py:71-104` |
| v2 `routing_agent.run` is still a `dict` lookup, with `random.uniform()` standing in for "confidence" — the plan's "RAG against a GHMC rulebook" is not implemented | `v2/backend/agents/routing_agent.py:70,80` |

One genuine bright spot, and it is worth knowing you already have it:
**`v2/backend/agents/voice_agent.py` implements a real multi-turn tool-calling loop** —
tool schemas including `check_duplicate` (line 199), a dispatch switch (lines 274-279), and
per-tool agent attribution (line 411). That is closer to true agency than anything in the
graph. The right move is to **lift that pattern into the graph as a `ToolNode`**, not to
build tool-calling from scratch. See 4A.4.

Put plainly: if you deleted LangGraph and called the two functions in sequence, behaviour
would be identical. An examiner who opens `graph.py` will see that. The fix is not more
nodes — it is using **checkpointing, interrupts, and cycles**, which is Part 4 below.

Reference for the primitives you are missing:
[persistence / checkpointers](https://docs.langchain.com/oss/python/langgraph/persistence),
[interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts),
[durable execution](https://docs.langchain.com/oss/javascript/langgraph/durable-execution).

---

## Part 2 — Corrections to the two documents

The plan and the mentorship review are broadly right in direction, but several factual
claims are now wrong. Planning off them will waste effort.

**Claimed done, not actually done:**

- `v2/docs/task.md` marks Phase 1 auth complete. Auth is **scaffolded, not enforced** —
  `require_role` is defined and has **zero call sites**; only `/api/auth/me` reads the
  token. Grievances, analytics, and admin endpoints are still fully open.
  (`v2/backend/auth.py:55`; `require_role` never appears in `v2/backend/routers/`)
- **Semantic dedup is wired but cannot work.** `intake_agent.py:11` imports
  `find_duplicate` and calls it at line 29 — so unlike my earlier read, the vector store
  *is* connected. But **`add_grievance_to_vector_db` has zero call sites**: nothing ever
  writes a grievance into the `grievances` collection. `find_duplicate` therefore queries
  a permanently empty collection and always returns `None`. It fails *silently* — no
  error, no log, just "never a duplicate", which is the worst failure mode for a demo
  because it looks like it is working.
- **RAG is not merely unbuilt, it is unreachable.** `seed_knowledge_base()` and
  `query_knowledge_base()` both have zero call sites. The `ghmc_knowledge` collection is
  never seeded and never queried by any agent.
- Duplicate detection in the **v1** tree is still hash-based on text
  (`backend/agents/intake_agent.py:134`, `hashlib.md5`). The mentorship review guesses it
  is "based on exact location strings" — it is text hashing. v2 replaced this with the
  vector path above.

**Three latent crashes to fix before the next demo:**

1. **The v2 backend cannot start.** `vector_store.py:5` does
   `from sentence_transformers import SentenceTransformer`, and `sentence_transformers` is
   **absent from `v2/backend/requirements.txt`**. The import chain
   `orchestrator → agents.graph → agents.intake_agent → vector_store → sentence_transformers`
   runs at module import time, so this is `ImportError` on boot, not a dormant branch.
   Note it also pulls in torch — a multi-hundred-MB install; budget for it.
2. **`voice_agent.py:275` imports a function that no longer exists.**
   `from agents.intake_agent import _check_duplicate` — the rewritten v2 `intake_agent`
   defines only `GrievanceClassification`, `get_llm`, and `run`. Every time the voice
   agent's `check_duplicate` tool fires, this raises `ImportError`.
3. **The spam-rejection path is dead code.** `intake_agent.run` returns `is_spam`
   (lines 50, 71) and `GrievanceState` declares it (`state.py:24`), but `intake_node`
   never copies it into state (`graph.py:15-22` omits the key). So `should_route`'s
   `state.get("is_spam")` (`graph.py:46`) and the orchestrator's `REJECTED_SPAM` branch
   (`orchestrator.py:55`) can never fire. Spam is classified and then routed to a real
   officer. One-line fix, but the "fake-complaint filtering" wow-feature in the plan is
   currently non-functional.

**Two silent-quality problems in the same file:**

- `intake_agent.py:22` pins `model_name="llama3-70b-8192"` — the superseded Llama 3 model,
  not the `llama-3.3-70b-versatile` the plan and your Groq snippet specify.
- `intake_agent.py:21` defaults the key to `"gsk_placeholder_for_demo"`, and the bare
  `except Exception` at line 54 swallows the resulting auth failure. Without a real key
  every complaint silently falls through to a **three-branch** keyword heuristic
  (pothole/road → Roads, garbage → Sanitation, else Other) — markedly weaker than v1's
  scored keyword engine, with nothing surfaced in the UI to say so. Log the fallback and
  set `engine: "simulation"` so the degradation is visible rather than invisible.

**Listed as future work, but already built (v1):**

- Autonomous SLA escalation as a background task — already exists in `backend/scheduler.py`
  (config-gated, `SLA_SCHEDULER_ENABLED`), and v2 has `tracking_agent.run_escalation_check`
  (`v2/backend/agents/tracking_agent.py:41`). The plan's "Agent 4: Watchdog" is a port and
  a wiring job, not a build.
- Department/officer performance analytics, CSV export, search + pagination, and an admin
  health endpoint already exist in v1 and are absent from the v2 plan's scope.

**Regression to watch:** `v2/backend/orchestrator.py:108` comments
`# Temporary stub for resolution`. v2's `process_resolution` dropped v1's AI resolution
verification, officer-load release, and escalation handling — and `_release_officer_load`
/ `_reacquire_officer_load` are literally `pass` (lines 129-130), while `can_transition`
returns `True` unconditionally (line 127), so the whole state machine is disabled. Since
`routing_agent` still *increments* `current_load` (line 87), officer load now only ever
goes up. v2 is currently **behind v1** on the resolution path.

**Design call to revisit:** the plan specifies PostgreSQL **and** ChromaDB. Use
**pgvector** instead — one datastore, one backup, vectors transactionally consistent with
the grievance row, one less service in `docker-compose`, and it removes the
`add_grievance_to_vector_db`-never-called class of bug entirely because the vector is
written in the same transaction as the row. Choose ChromaDB only if you want to write
about comparing them.

---

## Part 3 — Security issues to fix before anything else

1. **The Groq API key was pasted into a chat message. Treat it as compromised and rotate
   it now** at console.groq.com. Then keep it only in `v2/backend/.env` (already
   git-ignored — verified).
2. **Hardcoded JWT secret, in both trees.** `backend/auth.py:13` *and*
   `v2/backend/auth.py:13` both do
   `getattr(settings, 'JWT_SECRET', 'super-secret-jan-setu-key-v2')`, and neither
   `config.py` defines `JWT_SECRET` — so that literal *is* the live signing key. Anyone
   who reads the repo can forge an ADMIN token. Move it to env and fail loudly if unset.
3. **Zero endpoints enforce RBAC** (see Part 2). Right now any client can read every
   citizen's complaint and hit admin routes.
4. **Prompt-injection surface.** `raw_text` is citizen-supplied and flows into the LLM.
   You already get schema constraint for free via `with_structured_output`
   (`intake_agent.py:33`) — keep that, but also validate `category` against the GHMC
   taxonomy before the DB write, because a model can return a well-typed but invented
   category.
5. **PII to a third party.** Names/phones go to Groq. Redact before the call — for a
   government pitch this is a question you *will* be asked.
6. `chroma_data/` is not git-ignored; a binary vector store will end up in git.

---

## Part 4 — What to add beyond the plan

The plan covers multimodal intake, vision verification, ChromaDB dedup, RAG routing,
JWT+RBAC, L1/L2 escalation, feedback loop, heatmaps, multilingual semantic search,
predictive analytics, and fake-complaint filtering. Everything below is *additive*.

### 4A. Agentic depth — the highest-value additions

These are what separate "used an LLM" from "engineered an agent system", and they are
exactly the gaps in Part 1.

1. **Add a checkpointer** (`SqliteSaver` now, Postgres saver later), thread-keyed by
   `tracking_id`. Buys crash-resume mid-pipeline and replay of any grievance's reasoning.
   Prerequisite: **get `db_session` out of the state** — pass it via node config/context
   and keep state serializable. *Do this first; it unblocks 2, 3, and 6.*
2. **Human-in-the-loop via `interrupt()`.** When intake confidence is below a threshold,
   the graph *pauses durably* and appears in a supervisor review queue; the supervisor
   approves or corrects the classification and the graph resumes from that exact point.
   This is the single most convincing agentic demo available to you, and it is a real
   municipal requirement, not a gimmick.
3. **A genuine cycle: classify → critique → re-classify.** A `critique` node validates the
   model's JSON against the GHMC taxonomy; on failure it loops back with the error
   appended, bounded to 2 retries, then falls back to the keyword engine. Cycles are what
   make it a graph.
4. **Tool-calling routing agent.** Give it real tools — `search_rulebook(query)`,
   `list_departments()`, `get_officer_load(dept, ward)`, `get_ward_from_location(text)` —
   and let the model choose. Replaces the dict lookup and the fake `random.uniform`
   confidence with defensible agency. **You have most of this already:** port the tool
   schemas and dispatch loop from `voice_agent.py` (lines 199-279) into a LangGraph
   `ToolNode`, so one tool registry serves both the voice and text paths instead of two
   divergent implementations.
5. **Supervisor topology.** A supervisor node that dispatches to specialist sub-agents and
   can re-dispatch on poor results. Shows you understand orchestration patterns, not just
   one graph.
6. **Stream the graph to the UI.** `astream_events` over SSE/WebSocket so the Agent
   Monitor lights up node-by-node with live tokens. Low effort, very high demo impact,
   and it makes the graph legible to an examiner.
7. **Render the graph diagram from code** — `graph.get_graph().draw_mermaid_png()`. A
   generated architecture figure for the report, guaranteed to match the implementation.
8. **Evaluation harness — do not skip this.** 100–150 hand-labelled complaints; measure
   classification accuracy, routing accuracy, and severity MAE; publish a confusion
   matrix. Then compare **keyword baseline vs Llama-3.3-70B**, with and without RAG, on
   accuracy / latency / cost. Almost no student project measures itself, and this converts
   subjective claims into evidence. It is the cheapest route to top marks.
9. **Guardrails + telemetry.** Schema validation on every LLM output, refusal path for
   nonsense, per-grievance token/cost logging, and a fallback counter. Quantify the
   "graceful degradation" story you already have.

### 4B. Retrieval that holds up under questioning

10. **Hybrid retrieval** — BM25 + vector with reciprocal rank fusion. Pure embeddings miss
    exact tokens like street names, ward numbers, and tracking IDs. This is what production
    RAG does, and it is a strong write-up section.
11. **Cross-encoder reranking** on rulebook retrieval, with a before/after accuracy number.
12. **Citation-backed answers.** Every RAG answer cites the rulebook clause and page, and
    the UI shows it. Verifiable AI is a much better story than a fluent paragraph.
13. **Duplicate *clustering*, not pairwise flagging.** Introduce a canonical `Issue`
    entity with many `Report`s, a "me too" button for citizens, and a report count that
    feeds priority. Better product, richer data model, better demo than "flagged as
    duplicate".
14. **Multilingual embedding evaluation.** Measure retrieval accuracy per language
    (en/hi/te/ur) — the plan promises cross-lingual search; prove it works.

### 4C. Product and UX depth the plan omits

15. **Officer mobile PWA with an offline queue.** Field staff have poor connectivity;
    queue resolution photos locally and sync on reconnect. Demonstrates real-world thinking.
16. **EXIF/GPS extraction** from the citizen's photo to auto-locate the complaint, plus a
    check that the officer's resolution photo was taken *near* the original. Anti-fraud,
    and it makes the QA agent meaningfully stronger.
17. **Perceptual hashing (pHash)** of uploaded images to catch the same photo resubmitted
    across complaints. The plan says it will flag images "pulled from the internet" without
    saying how — pHash plus a reverse-image check is the how.
18. **Accessibility and low-literacy access.** IVR/phone intake, icon-based category
    picker, WCAG-compliant contrast and keyboard paths. A large share of GHMC citizens will
    never open a web app; this is the equity argument that makes the project a *public
    service* rather than a dashboard.
19. **Public transparency portal.** An anonymized, open, city-wide view plus downloadable
    open data — the civic-tech angle that differentiates this from a ticketing system.
20. **Officer workload fairness.** Assignment caps, skill matching, and a visible fairness
    metric so routing cannot quietly overload one person.
21. **Admin-editable SLA matrix,** versioned, instead of a Python dict.

### 4D. Operational credibility

22. **Tamper-evident audit ledger** — append-only, hash-chained records of who changed
    what. Cheap to build, and exactly what a government buyer asks about.
23. **Idempotency keys** on submission (a double-tap on mobile must not create two tickets).
24. **Outbox pattern** for SMS/WhatsApp so notifications survive a crash.
25. **Tracing.** OpenTelemetry spans across graph nodes, plus LangSmith or Langfuse for LLM
    traces. Showing a trace waterfall for one grievance is a strong viva moment.
26. **Load test with numbers** (Locust, e.g. 500 concurrent submissions) so throughput and
    p95 latency are measured, not asserted.
27. **Docker Compose + one-command seed**, and CI that runs the eval harness on every push.
28. **Threat model document** (STRIDE-lite) covering the items in Part 3.

### 4E. Report artifacts — these carry real marks

29. **Formal diagrams:** C4 context/container views, a sequence diagram for the full
    grievance lifecycle, an ER diagram, and the auto-generated LangGraph topology.
30. **Comparative study + ablation:** keyword vs LLM, with vs without RAG, large vs small
    model — accuracy, latency, cost per 1,000 grievances.
31. **Literature review and gap analysis** against MyGHMC, Bengaluru Sahaaya, Swachhata,
    and NYC 311. Positions your contribution instead of asserting novelty.
32. **Small user study** (10–15 participants, SUS score) — modest effort, disproportionate
    credibility.
33. **Fairness and ethics section.** Measure classification accuracy *per language* and
    for short, low-literacy complaints. If Telugu complaints are routed worse than English
    ones, that is a finding worth reporting — and a novel, defensible angle for this project.
34. **Limitations, failure modes, and a GHMC handover plan.**

### 4F. Reach ideas — where a genuine contribution could live

35. **Composite priority score** blending severity × affected population × repeat-report
    count × vulnerability of location (near a school, hospital, or low-income ward). An
    actual algorithm you can defend and tune, replacing a severity dict.
36. **Hotspot forecasting as a measured model.** The plan frames prediction as an LLM
    prompt. Instead train gradient boosting or Prophet on historical complaints plus
    rainfall data and report MAE against a holdout period. That is a real experimental
    result.
37. **Crew routing optimisation.** Given N open potholes in a ward, compute an efficient
    repair route with OR-Tools. Pairs classical optimisation with the LLM layer — examiners
    consistently reward that combination.
38. **Cross-city taxonomy transfer** — show the system adapting to a second municipality's
    categories with minimal reconfiguration.

---

## Part 5 — Revised phase order

The plan's four phases are reasonable but front-load the wrong risk: they build breadth on
an unenforced auth layer and an unwired vector store.

- **Phase 0 (½–1 day) — Make v2 actually run, then stop the bleeding.** In order:
  add `sentence-transformers` to `v2/backend/requirements.txt` (boot blocker); call
  `add_grievance_to_vector_db` after each successful insert so dedup has a corpus; fix
  `voice_agent.py:275`'s stale `_check_duplicate` import; propagate `is_spam` in
  `intake_node`; bump the model to `llama-3.3-70b-versatile`; rotate the Groq key; move
  `JWT_SECRET` to env in both trees; apply `require_role` to every write and every
  officer/admin read; restore `process_resolution`, `can_transition`, and the officer-load
  release from v1; git-ignore `chroma_data/`. Without this, later phases build on sand —
  and four of these are one-liners.
- **Phase 1 — LangGraph done properly.** Remove `db_session` from state, add a
  checkpointer, add the `persist_node`, add the critique cycle, add `interrupt()` for the
  low-confidence review queue, and stream events to the Agent Monitor. This is where the
  "true agentic system" claim is earned.
- **Phase 2 — Retrieval.** pgvector, hybrid search, reranking, rulebook RAG with
  citations (wire `seed_knowledge_base`/`query_knowledge_base` — they exist and are
  orphaned), and duplicate clustering with the `Issue`/`Report` split. Also **measure the
  dedup threshold** instead of guessing: `find_duplicate` is called with `threshold=0.3`
  against an L2 distance while the function's own default is `1.0`, and no one has checked
  which is right. Label ~30 duplicate pairs and pick the threshold from a
  precision/recall curve — that is a figure for the report.
- **Phase 3 — Multimodal and geospatial.** Vision verification, EXIF/GPS, pHash, maps and
  heatmaps.
- **Phase 4 — Measurement and hardening.** Eval harness, comparative study, load test,
  tracing, Docker Compose, CI. Run the eval *continuously* from Phase 1 onward so you can
  show improvement over time rather than a single end-of-project number.
- **Phase 5 — Report artifacts and the reach item** (pick one of 35–38, not all).

---

## Part 6 — Wiring Groq in

**v2 already calls Groq directly** via `langchain_groq.ChatGroq`
(`v2/backend/agents/intake_agent.py:8,22`). Two changes make it correct:

```python
# intake_agent.py
model_name="llama-3.3-70b-versatile"        # was "llama3-70b-8192" (superseded)
api_key = os.getenv("GROQ_API_KEY")          # drop the "gsk_placeholder_for_demo" default
if not api_key: raise LLMUnavailable(...)     # so the fallback is deliberate, not accidental
```

**v1 needs no new code at all.** `backend/agents/llm.py` already speaks the
OpenAI-compatible protocol Groq exposes, so the existing provider works as-is:

```env
LLM_PROVIDER=openai
LLM_API_KEY=<your rotated Groq key>
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

`_openai()` posts to `{base_url}/chat/completions` with a Bearer token and
`response_format: {"type":"json_object"}` — all supported by Groq. The Agent Monitor will
then report `engine: llm`, and every v1 agent still falls back to the keyword simulation if
a call fails, so offline demos keep working.

Worth deciding deliberately: v1 hand-rolls HTTP in `llm.py`, v2 uses LangChain's
`ChatGroq`. Two LLM access paths in one repo is the kind of thing an examiner asks about.
Pick one — `ChatGroq` if you are committing to LangGraph, since `with_structured_output`
and `bind_tools` come free with it — and delete or clearly demote the other.

---

## Part 7 — Where the marks actually move

| Gap the plan leaves open | Add | Marks it earns |
|---|---|---|
| LangGraph used as a chain | checkpointer + `interrupt()` + a cycle | "true agentic system" — the central claim |
| No measurement anywhere | eval harness + comparative study | rigour; converts claims to evidence |
| RAG asserted, not built (orphaned functions) | pgvector + hybrid + citations | advanced-AI credit |
| Auth declared, not enforced (0 call sites) | RBAC on every route | security/engineering credit |
| Prediction as an LLM prompt | a trained, evaluated model | genuine experimental result |
| No fairness analysis | per-language accuracy study | novelty and responsible-AI credit |

The honest summary: the plan describes an impressive *feature list*, and the code currently
implements the scaffolding for about a third of it — with three of the headline features
(semantic dedup, rulebook RAG, spam filtering) present in source but non-functional at
runtime. Depth on the five items above will score better than breadth across all
thirty-eight, and every one of them is something you can put a number on in the report.

---

## Appendix — How the claims above were checked

Every "zero call sites" and "not propagated" claim in Parts 1-3 was verified by AST
analysis over the repo on 2026-09-02, not by reading alone:

```
_check_duplicate in v2 intake_agent      → absent (top-level names: GrievanceClassification, get_llm, run)
sentence-transformers in v2 requirements → absent
intake_node returned keys                → category, sub_category, severity, sentiment,
                                            duplicate_cluster_id, agent_logs, error, agent, result
                                            (is_spam absent)
add_grievance_to_vector_db call sites    → 0
seed_knowledge_base call sites           → 0
query_knowledge_base call sites          → 0
find_duplicate call sites                → 1 (v2/backend/agents/intake_agent.py:29)
require_role call sites                  → 0
checkpoint | interrupt | bind_tools |
ToolNode | create_react_agent            → 0 matches, whole repo
```

Re-run this check after Phase 0; all of the zeros except the LangGraph row should have
moved.
