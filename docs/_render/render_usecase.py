"""
render_usecase.py — UML use case diagram for Jan Setu.

Three columns inside the system boundary: citizen services (left),
autonomous AI services (middle), staff operations (right). Column B sits
between A and C so every «include» / «extend» relationship is a short hop
or a clean run down a gutter, never an arc across the page.

Supporting systems (Groq, SMS gateway, map tiles) are deliberately absent:
they are implementation dependencies, not goal-bearing actors. They appear
in the component and deployment diagrams instead.
"""
from matplotlib.patches import Ellipse
from style import (canvas, save, actor, group, arrow, legend, note,
                   INK, LINE, tint,
                   CITIZEN, OFFICER, SUPERVISOR, ADMIN, AI, EXTERNAL,
                   FS_SMALL, FS_TINY)

W, H = 16, 16.4
CA, CB, CC = 28.5, 50.5, 72.5          # column centres
UW, UH = 18.0, 6.5                     # ellipse size  → 4-wide gutters
ROW0, DY = 15.0, 8.6


def R(i):
    return ROW0 + i * DY


def uc(ax, cx, i, label, colour, *, fs=FS_SMALL):
    y = R(i)
    ax.add_patch(Ellipse((cx, y), UW, UH, facecolor=tint(colour, 0.90),
                         edgecolor=colour, lw=1.2, zorder=3))
    ax.text(cx, y, label, ha="center", va="center", fontsize=fs,
            color=INK, zorder=4, linespacing=1.2)
    return {"c": (cx, y), "l": (cx - UW / 2, y), "r": (cx + UW / 2, y),
            "t": (cx, y - UH / 2), "b": (cx, y + UH / 2)}


def build():
    fig, ax = canvas(W, H,
                     title="Jan Setu — Use Case Diagram",
                     subtitle="AI-assisted municipal grievance redressal")

    group(ax, 17.0, 6.0, 67.0, 83.0,
          "«system»  Jan Setu Platform", edge=INK, fill="#fcfcfe", ls="-")

    for cx, txt, col in ((CA, "CITIZEN SERVICES", CITIZEN),
                         (CB, "AUTONOMOUS AI SERVICES", AI),
                         (CC, "STAFF OPERATIONS", OFFICER)):
        ax.text(cx, 10.0, txt, fontsize=FS_TINY, color=col,
                fontweight="bold", ha="center", va="center", zorder=4)

    # ── column A · citizen ──────────────────────────────────────────
    a_reg   = uc(ax, CA, 0, "Register / Log in", CITIZEN)
    a_sub   = uc(ax, CA, 1, "Submit grievance", CITIZEN)
    a_media = uc(ax, CA, 2, "Attach photo,\nvoice & GPS", CITIZEN)
    a_ivr   = uc(ax, CA, 3, "Report by\nvoice call (IVR)", CITIZEN)
    a_trk   = uc(ax, CA, 4, "Track status\nby ID", CITIZEN)
    a_met   = uc(ax, CA, 5, 'Confirm "me too"\non an open issue', CITIZEN)
    a_rate  = uc(ax, CA, 6, "Rate resolution\n(CSAT)", CITIZEN)
    a_reo   = uc(ax, CA, 7, "Reopen grievance", CITIZEN)
    a_map   = uc(ax, CA, 8, "Browse public\ntransparency map", CITIZEN)

    # ── column B · autonomous AI (ordered so includes stay adjacent) ─
    b_clf = uc(ax, CB, 1, "Classify, score severity\n& detect spam", AI)
    b_rt  = uc(ax, CB, 2, "Route to department\n& assign officer", AI)
    b_ntf = uc(ax, CB, 3, "Notify citizen\n(SMS / WhatsApp)", AI)
    b_dup = uc(ax, CB, 4, "Detect duplicate\n(semantic search)", AI)
    b_vqa = uc(ax, CB, 5, "Verify proof photo\n(vision + GPS)", AI)
    b_sla = uc(ax, CB, 6, "Monitor SLA &\nauto-escalate", AI)
    b_fc  = uc(ax, CB, 8, "Forecast ward\nhotspots", AI)

    # ── column C · staff ────────────────────────────────────────────
    c_que = uc(ax, CC, 1, "Work assigned\nqueue by SLA", OFFICER)
    c_prg = uc(ax, CC, 2, "Update progress\n& log site visit", OFFICER)
    c_prf = uc(ax, CC, 3, "Upload resolution\nproof photo", OFFICER)
    c_hit = uc(ax, CC, 4, "Review low-confidence\nclassification", SUPERVISOR)
    c_esc = uc(ax, CC, 5, "Handle escalation\n& reassign officer", SUPERVISOR)
    c_ana = uc(ax, CC, 6, "View ward & officer\nperformance", ADMIN)
    c_aud = uc(ax, CC, 7, "Inspect audit ledger\n& agent monitor", ADMIN)
    c_cfg = uc(ax, CC, 8, "Configure SLA matrix,\nusers & roles", ADMIN)

    # ── actors ──────────────────────────────────────────────────────
    actor(ax, 8.0, 40.0, "Citizen", colour=CITIZEN, scale=1.2)
    actor(ax, 92.0, 18.0, "Field Officer\n(L1)", colour=OFFICER, scale=1.1)
    actor(ax, 92.0, 44.0, "Supervisor\n(L2)", colour=SUPERVISOR, scale=1.1)
    actor(ax, 92.0, 62.0, "Department\nHead", colour=ADMIN, scale=1.1)
    actor(ax, 92.0, 79.0, "System\nAdministrator", colour=ADMIN, scale=1.1)

    A = dict(colour=LINE, lw=0.95, style="-", ms=0, label_bg=False)

    for uco in (a_reg, a_sub, a_media, a_ivr, a_trk, a_met, a_rate, a_reo, a_map):
        arrow(ax, (11.4, 41.2), uco["l"], **A)
    for uco in (c_que, c_prg, c_prf):
        arrow(ax, (88.6, 19.2), uco["r"], **A)
    for uco in (c_hit, c_esc):
        arrow(ax, (88.6, 45.2), uco["r"], **A)
    arrow(ax, (88.6, 63.2), c_ana["r"], **A)
    arrow(ax, (88.6, 63.2), c_aud["r"], **A)
    for uco in (c_aud, c_cfg):
        arrow(ax, (88.6, 80.2), uco["r"], **A)

    # ── «include» ───────────────────────────────────────────────────
    I = dict(colour=AI, lw=1.05, ls=(0, (4, 2.4)), style="-|>", ms=8,
             fs=FS_TINY, label_bg=True, label_dy=0.0, label="«include»")
    arrow(ax, a_sub["r"], b_clf["l"], label_pos=0.5, **I)
    arrow(ax, a_sub["r"], b_dup["l"], label_pos=0.72, rad=-0.10, **I)
    arrow(ax, b_clf["b"], b_rt["t"], label_pos=0.5, **I)
    arrow(ax, b_rt["b"], b_ntf["t"], label_pos=0.5, **I)
    arrow(ax, c_prf["l"], b_vqa["r"], label_pos=0.68, rad=-0.10, **I)

    # ── «extend» ────────────────────────────────────────────────────
    E = dict(lw=1.05, ls=(0, (4, 2.4)), style="-|>", ms=8, fs=FS_TINY,
             label_bg=True, label_dy=0.0, label="«extend»")
    arrow(ax, a_media["t"], a_sub["b"], colour=CITIZEN, label_pos=0.5, **E)
    arrow(ax, a_ivr["l"], a_sub["l"], colour=CITIZEN, rad=0.14,
          label_pos=0.25, label_dx=5.0, **E)
    arrow(ax, a_reo["t"], a_rate["b"], colour=CITIZEN, label_pos=0.5, **E)
    arrow(ax, b_clf["r"], c_hit["l"], colour=SUPERVISOR, label_pos=0.22,
          rad=0.09, **E)
    arrow(ax, b_sla["r"], c_esc["l"], colour=SUPERVISOR, label_pos=0.5,
          rad=-0.12, **E)

    legend(ax, [(CITIZEN, "Citizen-facing"),
                (AI, "Autonomous AI service"),
                (OFFICER, "Field officer"),
                (SUPERVISOR, "Supervisor / escalation"),
                (ADMIN, "Analytics & administration")],
           1.0, 15.0, title="LEGEND")

    note(ax, 1.0, 93.0, 96,
         "Reading order: a citizen use case on the left triggers AI services in the middle, which create work for staff on the right.\n"
         "«include» — the behaviour always runs as part of the base use case.    «extend» — it runs only when its guard holds:\n"
         "        Review low-confidence classification    [classifier confidence < 0.75]                Attach photo / Report by IVR    [alternate intake channel chosen]\n"
         "        Handle escalation & reassign officer    [SLA deadline passed, status ≠ RESOLVED]     Reopen grievance    [citizen rejects the resolution]\n"
         "Supporting systems (Groq LLM, SMS gateway, map tiles) are implementation dependencies rather than actors — see the component and deployment diagrams.")

    return save(fig, "01_use_case_diagram")


if __name__ == "__main__":
    print("wrote", *build())
