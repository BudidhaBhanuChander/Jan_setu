"""
render_dfd.py — Gane–Sarson data flow diagrams for Jan Setu (levels 0, 1, 2).

Level 0 puts the whole platform in one process ringed by external entities, all
flows horizontal so every data name has room. Level 1 uses banded rows —
externals / processes / stores / processes / externals — so store access is a
short vertical hop. Level 2 explodes the AI triage process and shows the
LLM-or-keyword fallback that lets the system run offline.
"""
from style import (canvas, save, box, sharp, store, arrow, legend, note, tint,
                   INK, INK_SOFT, LINE, CANVAS, PAPER,
                   CITIZEN, OFFICER, SUPERVISOR, ADMIN, AI, STORE, EXTERNAL,
                   FS_BODY, FS_SMALL, FS_TINY)

F = dict(colour=LINE, lw=1.05, style="-|>", ms=8, fs=FS_TINY, label_bg=True)


def proc(ax, x, y, w, h, num, name, colour=AI, fs=FS_SMALL):
    """Numbered DFD process bubble."""
    box(ax, x, y, w, h, f"{num}\n{name}", fill=tint(colour, 0.91),
        edge=colour, fs=fs, radius=2.2, lw=1.3)
    return dict(l=(x, y + h / 2), r=(x + w, y + h / 2),
                t=(x + w / 2, y), b=(x + w / 2, y + h),
                c=(x + w / 2, y + h / 2), x=x, y=y, w=w, h=h)


def ext(ax, x, y, w, h, name, colour=EXTERNAL, fs=FS_SMALL):
    """External entity — square-cornered, per Gane–Sarson."""
    sharp(ax, x, y, w, h, name, fill=tint(colour, 0.93), edge=colour,
          fs=fs, lw=1.3)
    return dict(l=(x, y + h / 2), r=(x + w, y + h / 2),
                t=(x + w / 2, y), b=(x + w / 2, y + h),
                c=(x + w / 2, y + h / 2), x=x, y=y, w=w, h=h)


def dstore(ax, x, y, w, h, tag, name, fs=FS_TINY):
    store(ax, x, y, w, h, f"{tag}   {name}", fs=fs)
    return dict(l=(x, y + h / 2), r=(x + w, y + h / 2),
                t=(x + w / 2, y), b=(x + w / 2, y + h),
                c=(x + w / 2, y + h / 2), x=x, y=y, w=w, h=h)


def hlegend(ax, items, x, y, *, gap=19.0, fs=FS_TINY):
    """Horizontal swatch legend — keeps the footer one line tall."""
    from matplotlib.patches import FancyBboxPatch
    for i, (c, t) in enumerate(items):
        xx = x + i * gap
        ax.add_patch(FancyBboxPatch((xx, y - 0.85), 2.4, 1.7,
                                    boxstyle="round,pad=0,rounding_size=0.4",
                                    facecolor=tint(c, 0.85), edgecolor=c,
                                    lw=1.0, zorder=3))
        ax.text(xx + 3.4, y, t, fontsize=fs, color=INK_SOFT, va="center",
                ha="left", zorder=3)


# ══════════════════════════════════════════════════════════════════════
# LEVEL 0 — context diagram
# ══════════════════════════════════════════════════════════════════════
def build_l0():
    fig, ax = canvas(16, 12,
                     title="Jan Setu — DFD Level 0 (Context Diagram)",
                     subtitle="the platform as a single process, with every "
                              "external entity it exchanges data with")

    p = proc(ax, 33, 6, 34, 62, "0", "Jan Setu Platform\n\n"
             "AI-assisted municipal\ngrievance redressal", fs=FS_BODY)

    # left column — the citizen and the supporting services
    cit = ext(ax, 2, 8, 20, 8, "Citizen", colour=CITIZEN)
    llm = ext(ax, 2, 21, 20, 8, "«external»\nLLM API\n(Groq / OpenAI-compatible)",
              fs=FS_TINY)
    stt = ext(ax, 2, 34, 20, 8, "«external»\nDeepgram STT  +  gTTS", fs=FS_TINY)
    sms = ext(ax, 2, 47, 20, 8, "«external»\nSMS / WhatsApp Gateway", fs=FS_TINY)
    mapt = ext(ax, 2, 58, 20, 8, "«external»\nMap Tile Service", fs=FS_TINY)

    # right column — the staff roles
    off = ext(ax, 78, 8, 20, 8, "Field Officer (L1)", colour=OFFICER)
    sup = ext(ax, 78, 21, 20, 8, "Supervisor (L2)", colour=SUPERVISOR)
    hed = ext(ax, 78, 34, 20, 8, "Department Head", colour=ADMIN)
    adm = ext(ax, 78, 47, 20, 8, "System Administrator", colour=ADMIN)

    def LR(e, dy, text, into=True, colour=LINE):
        """Horizontal flow between a left-hand entity and the platform."""
        y = e["y"] + dy
        a, b = ((e["x"] + e["w"], y), (33, y)) if into else ((33, y), (e["x"] + e["w"], y))
        arrow(ax, a, b, label=text, label_pos=0.5, label_dy=-2.2,
              colour=colour, lw=1.05, style="-|>", ms=8, fs=FS_TINY)

    def RL(e, dy, text, into=True, colour=LINE):
        """Horizontal flow between a right-hand entity and the platform."""
        y = e["y"] + dy
        a, b = ((e["x"], y), (67, y)) if into else ((67, y), (e["x"], y))
        arrow(ax, a, b, label=text, label_pos=0.5, label_dy=-2.2,
              colour=colour, lw=1.05, style="-|>", ms=8, fs=FS_TINY)

    LR(cit, 2.6, "grievance text, photo,\nGPS, language, channel", True, CITIZEN)
    LR(cit, 6.4, "tracking ID, status,\nSLA countdown, notices", False, CITIZEN)
    LR(llm, 2.6, "category, severity, sentiment,\nconfidence, reasoning", True)
    LR(llm, 6.4, "classification &\nrouting prompt", False)
    LR(stt, 2.6, "transcript,\nsynthesised speech", True)
    LR(stt, 6.4, "audio stream,\nreply text", False)
    LR(sms, 4.5, "notification payload\n(message, language, phone)", False)
    LR(mapt, 4.5, "ward & hotspot\nbase-map tiles", True)

    RL(off, 2.6, "progress note, site-visit log,\nresolution proof photo", True, OFFICER)
    RL(off, 6.4, "assigned queue ordered\nby SLA deadline", False, OFFICER)
    RL(sup, 2.6, "review verdict, reassignment,\noverride of AI label", True, SUPERVISOR)
    RL(sup, 6.4, "low-confidence items,\nescalation alerts", False, SUPERVISOR)
    RL(hed, 4.5, "ward, department & officer\nperformance reports", False, ADMIN)
    RL(adm, 2.6, "SLA matrix, users, roles,\nreset & reseed commands", True, ADMIN)
    RL(adm, 6.4, "audit ledger,\nagent execution log", False, ADMIN)

    hlegend(ax, [(CITIZEN, "Citizen"), (OFFICER, "Field officer"),
                 (SUPERVISOR, "Supervisor"), (ADMIN, "Head / administrator"),
                 (EXTERNAL, "Third-party system")], 2, 70.5, gap=19.2)

    note(ax, 2, 72.8, 96,
         "Gane–Sarson notation: square-cornered boxes are external entities, the rounded box is the process under study.\n"
         "Level 0 asserts the system boundary — everything inside process 0 is decomposed in the level-1 diagram.\n"
         "Every flow is named with the data it carries, never with the verb that moves it.")
    return save(fig, "02_dfd_level0_context")


# ══════════════════════════════════════════════════════════════════════
# LEVEL 1 — decomposition of process 0
# ══════════════════════════════════════════════════════════════════════
def build_l1():
    fig, ax = canvas(18, 13,
                     title="Jan Setu — DFD Level 1",
                     subtitle="process 0 decomposed into eight subsystems and "
                              "five data stores")

    # ── row 1 · sources ─────────────────────────────────────────────
    cit = ext(ax, 1, 4, 15, 7, "Citizen", colour=CITIZEN, fs=FS_TINY)
    stt = ext(ax, 17, 4, 15, 7, "«external»\nDeepgram\nSTT + gTTS", fs=FS_TINY)
    llm = ext(ax, 36, 4, 17, 7, "«external»\nLLM API (Groq)", fs=FS_TINY)
    sms = ext(ax, 74, 4, 20, 7, "«external»\nSMS / WhatsApp Gateway", fs=FS_TINY)

    # ── row 2 · intake → triage → routing → notify ──────────────────
    p1 = proc(ax, 2, 19, 20, 9, "1.0", "Intake &\nValidation")
    p2 = proc(ax, 26, 19, 20, 9, "2.0", "AI Triage\n(classify · severity · dedup)")
    p3 = proc(ax, 50, 19, 20, 9, "3.0", "Routing &\nAssignment")
    p6 = proc(ax, 74, 19, 20, 9, "6.0", "Notification")

    # ── row 3 · data stores ─────────────────────────────────────────
    d1 = dstore(ax, 1, 34, 18, 6, "D1", "grievances")
    d2 = dstore(ax, 21, 34, 18, 6, "D2", "status_events")
    d3 = dstore(ax, 41, 34, 18, 6, "D3", "escalations")
    d4 = dstore(ax, 61, 34, 18, 6, "D4", "agent_logs")
    d5 = dstore(ax, 80, 34, 17, 6, "D5", "users ·\ndepartments · zones")

    # ── row 4 · execution → tracking → analytics → admin ────────────
    p4 = proc(ax, 2, 46, 20, 9, "4.0", "Work Execution &\nProof Capture", OFFICER)
    p5 = proc(ax, 26, 46, 20, 9, "5.0", "SLA Tracking &\nEscalation", AI)
    p7 = proc(ax, 50, 46, 20, 9, "7.0", "Analytics &\nReporting", ADMIN)
    p8 = proc(ax, 74, 46, 20, 9, "8.0", "Administration\n& Audit", ADMIN)

    # ── row 5 · sinks ───────────────────────────────────────────────
    off = ext(ax, 2, 61, 20, 7, "Field Officer (L1)", colour=OFFICER, fs=FS_TINY)
    sup = ext(ax, 26, 61, 20, 7, "Supervisor (L2)", colour=SUPERVISOR, fs=FS_TINY)
    hed = ext(ax, 50, 61, 20, 7, "Department Head", colour=ADMIN, fs=FS_TINY)
    adm = ext(ax, 74, 61, 20, 7, "System Administrator", colour=ADMIN, fs=FS_TINY)

    def f(a, b, text, *, pos=0.5, dy=0.0, dx=0.0, rad=0.0, colour=LINE):
        arrow(ax, a, b, label=text, label_pos=pos, label_dy=dy, label_dx=dx,
              rad=rad, colour=colour, lw=1.0, style="-|>", ms=8, fs=FS_TINY)

    # intake chain
    f(cit["b"], p1["t"], "grievance text, photo,\nGPS, language", pos=0.25,
      colour=CITIZEN)
    f(stt["b"], (p1["x"] + 16, p1["y"]), "voice transcript", pos=0.25)
    f(p1["r"], p2["l"], "validated\ngrievance", dy=-6.8)
    f(p2["r"], p3["l"], "category, severity,\nconfidence", dy=-6.8)
    f(p3["r"], p6["l"], "assignment\n+ SLA deadline", dy=-6.8)
    f((41, 11), (35, 19), "labels &\nreasoning", pos=0.28)
    f((43, 19), (49, 11), "prompt", pos=0.78)
    f(p6["t"], sms["b"], "notification payload", pos=0.5)

    # store access — top band
    f(p1["b"], d1["t"], "new grievance\nrecord", dx=-2.0)
    f(p2["b"], (d1["x"] + 14, d1["y"]), "labels, cluster key", dx=2.0, rad=0.08)
    f(p2["b"], d4["t"], "agent trace", dx=-3.0, rad=-0.12)
    f(p3["b"], (d5["x"] + 4, d5["y"]), "officer load,\ndepartment lookup", rad=-0.10)
    f(p3["b"], (d2["x"] + 14, d2["y"]), "ASSIGNED event", dx=3.0, rad=0.10)

    # store access — bottom band
    f((d1["x"] + 4, d1["y"] + d1["h"]), p4["t"], "assigned queue", dx=-2.0)
    f((6, 55), (6, 61), "work order,\nSLA countdown", dx=-3.4, colour=OFFICER)
    f((18, 61), (18, 55), "progress,\nproof photo", dx=3.6, colour=OFFICER)
    f(p4["t"], (d2["x"] + 4, d2["y"] + d2["h"]), "IN_PROGRESS /\nRESOLVED event", dx=-2.0)
    f((d1["x"] + 14, d1["y"] + d1["h"]), p5["t"], "sla_deadline, status", dx=2.0, rad=-0.10)
    f(p5["t"], (d3["x"] + 4, d3["y"] + d3["h"]), "breach record", dx=-1.0, rad=0.10)
    f(p5["b"], sup["t"], "escalation alert,\nreassignment task", colour=SUPERVISOR)
    f((d4["x"] + 4, d4["y"] + d4["h"]), p7["t"], "agent metrics", dx=-8.0, rad=0.10)
    f((d3["x"] + 14, d3["y"] + d3["h"]), p7["t"], "breach counts", dx=1.5, dy=2.4, rad=-0.08)
    f(p7["b"], hed["t"], "ward, department &\nofficer scorecards", colour=ADMIN)
    f(adm["t"], p8["b"], "SLA matrix, users,\nroles, reset", colour=ADMIN)
    f(p8["t"], (d5["x"] + 13, d5["y"] + d5["h"]), "role & SLA config", dx=3.0)
    f((d4["x"] + 14, d4["y"] + d4["h"]), p8["t"], "audit trail", dx=1.0, dy=2.4, rad=-0.10)

    hlegend(ax, [(AI, "Autonomous AI process"), (OFFICER, "Officer-driven process"),
                 (ADMIN, "Reporting & administration"), (STORE, "Data store"),
                 (EXTERNAL, "External entity")], 1.0, 70.5, gap=19.4)

    note(ax, 1.0, 72.6, 96,
         "Read top-to-bottom: intake and AI triage feed the stores; execution, tracking, reporting and administration read them back.\n"
         "Process 2.0 is decomposed further in the level-2 diagram. D5 groups the three reference tables (users, departments, zones)\n"
         "because every process reads them and drawing each separately would obscure the flows that matter.")
    return save(fig, "03_dfd_level1")


# ══════════════════════════════════════════════════════════════════════
# LEVEL 2 — explosion of process 2.0, AI triage
# ══════════════════════════════════════════════════════════════════════
def build_l2():
    fig, ax = canvas(16, 11.4,
                     title="Jan Setu — DFD Level 2  ·  Process 2.0 AI Triage",
                     subtitle="the classification pipeline, including the "
                              "keyword fallback that keeps it working offline")

    X, W_ = 4, 24
    ys = [5, 13.4, 21.8, 30.2, 38.6, 47.0, 55.4]
    lbl = [("2.1", "Detect language"),
           ("2.2", "Normalise text &\nextract entities"),
           ("2.3", "Detect spam & abuse"),
           ("2.4", "Classify category\n& sub-category"),
           ("2.5", "Score severity\n& sentiment"),
           ("2.6", "Compute duplicate\ncluster key"),
           ("2.7", "Score confidence\n& gate for review")]
    P = [proc(ax, X, y, W_, 6.6, n, t, fs=FS_TINY) for y, (n, t) in zip(ys, lbl)]

    src = ext(ax, 4, 65, 24, 6.6, "1.0  Intake & Validation", colour=CITIZEN,
              fs=FS_TINY)
    arrow(ax, (X + 4, 65), (X + 4, ys[0] + 6.6), colour=CITIZEN, lw=1.0,
          style="-|>", ms=8, fs=FS_TINY, rad=0.0)
    ax.text(X - 2.6, 36, "validated grievance text  ·  language hint  ·  channel",
            rotation=90, ha="center", va="center", fontsize=FS_TINY,
            color=INK_SOFT)

    for a, b in zip(P, P[1:]):
        arrow(ax, a["b"], b["t"], colour=AI, lw=1.0, style="-|>", ms=8)

    # right-hand column
    RX, RW = 56, 26
    llm = ext(ax, RX, 5, RW, 7.6, "«external»  LLM API\nGroq · llama-3.3-70b-versatile\n"
              "(OpenAI-compatible)", fs=FS_TINY)
    kw = proc(ax, RX, 17, RW, 7.6, "2.4a", "Keyword rule engine\n"
              "(offline fallback — no API key)", colour=EXTERNAL, fs=FS_TINY)
    d1 = dstore(ax, RX, 30, RW, 6, "D1", "grievances")
    d4 = dstore(ax, RX, 39, RW, 6, "D4", "agent_logs")
    rt = ext(ax, RX, 49, RW, 7, "3.0  Routing & Assignment", colour=OFFICER,
             fs=FS_TINY)
    sup = ext(ax, RX, 61, RW, 7, "Supervisor (L2)", colour=SUPERVISOR, fs=FS_TINY)

    def g(a, b, text, *, pos=0.5, dy=-1.9, dx=0.0, rad=0.0, colour=LINE):
        arrow(ax, a, b, label=text, label_pos=pos, label_dy=dy, label_dx=dx,
              rad=rad, colour=colour, lw=1.0, style="-|>", ms=8, fs=FS_TINY)

    # the LLM-or-keyword branch, drawn out of 2.4
    g(P[3]["r"], (RX, 20.8), "prompt: text + taxonomy\n[LLM_API_KEY absent → 2.4a]",
      pos=0.46, dy=-2.4, rad=-0.06)
    g(P[3]["r"], (RX, 8.8), "prompt: text + taxonomy\n[LLM_API_KEY present]",
      pos=0.46, dy=-2.4, rad=0.06)
    g((RX, 10.4), (X + W_, 26.5), "category, sub-category,\nseverity, confidence",
      pos=0.5, dy=-2.4, rad=0.06)
    g((RX, 22.4), (X + W_, 34.0), "keyword-matched\nlabels, confidence ≈ 0.55",
      pos=0.52, dy=2.6, rad=-0.06)

    # writes and outputs
    g(P[4]["r"], d1["l"], "severity, sentiment", pos=0.55, dy=-1.9, rad=-0.05)
    g(P[5]["r"], (RX, 33.5), "duplicate_cluster_id", pos=0.55, dy=2.2, rad=0.05)
    g(P[6]["r"], d4["l"], "agent trace: input, output,\nconfidence, duration_ms",
      pos=0.5, dy=-2.4, rad=0.05)
    g(P[6]["r"], rt["l"], "classified grievance\n[confidence ≥ 0.75]",
      pos=0.52, dy=-2.4, rad=-0.05, colour=OFFICER)
    g(P[6]["r"], sup["l"], "review task\n[confidence < 0.75]",
      pos=0.55, dy=2.6, rad=-0.12, colour=SUPERVISOR)
    g(P[2]["r"], (RX, 31.5), "spam verdict → CLOSED\n[is_spam = true]",
      pos=0.5, dy=-2.4, rad=-0.10, colour=SUPERVISOR)

    legend(ax, [(AI, "Triage sub-process"), (EXTERNAL, "Fallback / external"),
                (OFFICER, "Onward flow"), (SUPERVISOR, "Human review"),
                (STORE, "Data store")], 2.0, 74.0, title=None)

    note(ax, 34, 73.0, 64,
         "2.4 asks the LLM first and falls back to the keyword rule engine (2.4a) when no API key is configured — the guard is written\n"
         "on the flow, so the same diagram documents the online and the offline demo path. 2.7 is the human-in-the-loop gate: below\n"
         "0.75 confidence the item is parked for a supervisor instead of being routed automatically.")
    return save(fig, "04_dfd_level2_ai_triage")


def build():
    out = []
    for fn in (build_l0, build_l1, build_l2):
        out.extend(fn())
    return out


if __name__ == "__main__":
    print("wrote", *build(), sep="\n  ")


