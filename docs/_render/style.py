"""
style.py — shared visual language for every Jan Setu design artefact.

One palette, one type scale, one set of helpers. Every render_*.py imports
from here so the whole diagram set looks like it came from one hand.

Print-safe: all colours are light-background, and every fill/stroke pair
keeps enough contrast to survive greyscale photocopying.
"""
import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle, Circle, FancyArrowPatch
from matplotlib.lines import Line2D

# ── paths ────────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.dirname(HERE)
DIAGRAMS = os.path.join(DOCS, "diagrams")
WIREFRAMES = os.path.join(DOCS, "wireframes")
for d in (DIAGRAMS, WIREFRAMES):
    os.makedirs(d, exist_ok=True)

# ── palette ──────────────────────────────────────────────────────────────
INK        = "#1d2433"   # primary text / strong strokes
INK_SOFT   = "#5b6478"   # secondary text
LINE       = "#98a2b8"   # ordinary strokes
LINE_FAINT = "#d3d9e4"   # hairlines, lifelines, grid
PAPER      = "#ffffff"
CANVAS     = "#f7f8fb"   # page tint behind groups

# semantic accents — used consistently across ALL diagrams
CITIZEN    = "#2f6f9f"   # blue    — citizen-facing
OFFICER    = "#3f7d58"   # green   — field / officer
SUPERVISOR = "#8a5a2b"   # brown   — supervisor / escalation
ADMIN      = "#6b4d8f"   # purple  — admin / analytics
AI         = "#b4553c"   # rust    — AI / agent
STORE      = "#4a5568"   # slate   — data stores
EXTERNAL   = "#7a7f8c"   # grey    — third-party systems

def tint(hex_colour, amount=0.90):
    """Lighten a hex colour toward white. amount=0 → unchanged, 1 → white."""
    h = hex_colour.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    r, g, b = (int(c + (255 - c) * amount) for c in (r, g, b))
    return f"#{r:02x}{g:02x}{b:02x}"

# ── type scale (points) ──────────────────────────────────────────────────
FS_TITLE  = 15
FS_SUB    = 9.5
FS_HEAD   = 10.5
FS_BODY   = 9
FS_SMALL  = 7.8
FS_TINY   = 6.8
FONT = "DejaVu Sans"

plt.rcParams.update({
    "font.family": FONT,
    "savefig.facecolor": PAPER,
    "figure.facecolor": PAPER,
    "svg.fonttype": "none",     # keep text as text in the SVG (editable)
})


# ── figure scaffolding ───────────────────────────────────────────────────
def canvas(w, h, title=None, subtitle=None):
    """A blank coordinate space measured in 0..100 x, 0..(100*h/w) y."""
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100 * h / w)
    ax.invert_yaxis()            # y grows downward — reads like a page
    ax.axis("off")
    if title:
        ax.text(0, -1.6, title, fontsize=FS_TITLE, fontweight="bold",
                color=INK, va="bottom", ha="left")
    if subtitle:
        ax.text(100, -1.8, subtitle, fontsize=FS_SUB, color=INK_SOFT,
                va="bottom", ha="right")
    return fig, ax


def save(fig, name, folder=None):
    """Write PNG (300 dpi, for Word) and SVG (vector, for scaling)."""
    folder = folder or DIAGRAMS
    png = os.path.join(folder, name + ".png")
    svg = os.path.join(folder, name + ".svg")
    fig.savefig(png, dpi=300, bbox_inches="tight", pad_inches=0.28)
    fig.savefig(svg, bbox_inches="tight", pad_inches=0.28)
    plt.close(fig)
    return png, svg


# ── primitives ───────────────────────────────────────────────────────────
def box(ax, x, y, w, h, label, *, fill=PAPER, edge=INK, fs=FS_BODY,
        radius=0.9, lw=1.25, bold=False, text_colour=None, ls="-", va="center"):
    """Rounded rectangle with centred wrapped label. x,y = top-left."""
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0,rounding_size={radius}",
        linewidth=lw, edgecolor=edge, facecolor=fill, linestyle=ls,
        mutation_aspect=1, zorder=2))
    ty = y + h / 2 if va == "center" else y + 1.6
    ax.text(x + w / 2, ty, label, ha="center",
            va="center" if va == "center" else "top",
            fontsize=fs, color=text_colour or INK,
            fontweight="bold" if bold else "normal", zorder=3,
            linespacing=1.35)
    return (x, y, w, h)


def sharp(ax, x, y, w, h, label, *, fill=PAPER, edge=INK, fs=FS_BODY,
          lw=1.25, bold=False, text_colour=None, ls="-"):
    """Square-cornered rectangle (external entities, deployment nodes)."""
    ax.add_patch(Rectangle((x, y), w, h, linewidth=lw, edgecolor=edge,
                           facecolor=fill, linestyle=ls, zorder=2))
    ax.text(x + w / 2, y + h / 2, label, ha="center", va="center",
            fontsize=fs, color=text_colour or INK,
            fontweight="bold" if bold else "normal", zorder=3, linespacing=1.35)
    return (x, y, w, h)


def store(ax, x, y, w, h, label, *, edge=STORE, fs=FS_SMALL):
    """Gane–Sarson open-ended data store."""
    fill = tint(edge, 0.93)
    ax.add_patch(Rectangle((x, y), w, h, linewidth=1.2, edgecolor=fill,
                           facecolor=fill, zorder=2))
    for yy in (y, y + h):
        ax.add_line(Line2D([x, x + w], [yy, yy], color=edge, lw=1.3, zorder=3))
    ax.add_line(Line2D([x, x], [y, y + h], color=edge, lw=1.3, zorder=3))
    ax.text(x + w / 2 + 0.6, y + h / 2, label, ha="center", va="center",
            fontsize=fs, color=INK, zorder=4, linespacing=1.3)
    return (x, y, w, h)


def actor(ax, x, y, label, *, colour=INK, scale=1.0, fs=FS_SMALL, below=True):
    """UML stick figure. x,y = centre of the head."""
    r = 1.5 * scale
    ax.add_patch(Circle((x, y), r, fill=False, lw=1.4, edgecolor=colour, zorder=3))
    seg = [([x, x], [y + r, y + r + 3.4 * scale]),                       # spine
           ([x - 2.5 * scale, x + 2.5 * scale],
            [y + r + 1.2 * scale, y + r + 1.2 * scale]),                 # arms
           ([x, x - 2.2 * scale],
            [y + r + 3.4 * scale, y + r + 7.0 * scale]),                 # leg L
           ([x, x + 2.2 * scale],
            [y + r + 3.4 * scale, y + r + 7.0 * scale])]                 # leg R
    for xs, ys in seg:
        ax.add_line(Line2D(xs, ys, color=colour, lw=1.4, zorder=3,
                           solid_capstyle="round"))
    ty = y + r + 8.9 * scale if below else y - r - 1.2
    ax.text(x, ty, label, ha="center", va="top" if below else "bottom",
            fontsize=fs, color=colour, fontweight="bold", zorder=3,
            linespacing=1.3)


def arrow(ax, p0, p1, *, colour=INK_SOFT, lw=1.2, style="-|>", ls="-",
          rad=0.0, label=None, label_pos=0.5, fs=FS_TINY, label_dy=-1.1,
          label_dx=0.0, label_bg=True, ms=7, zorder=4):
    """Curved or straight annotated arrow between two points."""
    ax.add_patch(FancyArrowPatch(
        p0, p1, arrowstyle=style, mutation_scale=ms, linewidth=lw,
        color=colour, linestyle=ls, zorder=zorder,
        connectionstyle=f"arc3,rad={rad}",
        shrinkA=1.5, shrinkB=1.5))
    if label:
        lx = p0[0] + (p1[0] - p0[0]) * label_pos + label_dx
        ly = p0[1] + (p1[1] - p0[1]) * label_pos + label_dy
        ax.text(lx, ly, label, ha="center", va="center", fontsize=fs,
                color=colour, zorder=zorder + 1, linespacing=1.25,
                bbox=dict(boxstyle="round,pad=0.22", fc=PAPER,
                          ec="none", alpha=0.92) if label_bg else None)


def group(ax, x, y, w, h, label, *, edge=LINE, fill=CANVAS, fs=FS_SMALL,
          ls=(0, (5, 3))):
    """Dashed grouping frame with a label in the top-left."""
    ax.add_patch(FancyBboxPatch(
        (x, y), w, h, boxstyle="round,pad=0,rounding_size=1.2",
        linewidth=1.1, edgecolor=edge, facecolor=fill, linestyle=ls, zorder=1))
    ax.text(x + 1.4, y + 1.5, label, ha="left", va="center", fontsize=fs,
            color=INK_SOFT, fontweight="bold", zorder=2)


def legend(ax, items, x, y, *, fs=FS_TINY, gap=3.1, title=None):
    """Compact swatch legend. items = [(colour, text), ...]"""
    if title:
        ax.text(x, y - gap, title, fontsize=fs, color=INK_SOFT,
                fontweight="bold", va="center", ha="left")
    for i, (c, t) in enumerate(items):
        yy = y + i * gap
        ax.add_patch(FancyBboxPatch((x, yy - 0.85), 2.4, 1.7,
                                    boxstyle="round,pad=0,rounding_size=0.4",
                                    facecolor=tint(c, 0.85), edgecolor=c,
                                    lw=1.0, zorder=3))
        ax.text(x + 3.4, yy, t, fontsize=fs, color=INK_SOFT, va="center",
                ha="left", zorder=3)


def note(ax, x, y, w, text, *, fs=FS_TINY, colour=INK_SOFT):
    """Footnote paragraph under a diagram."""
    ax.text(x, y, text, fontsize=fs, color=colour, va="top", ha="left",
            linespacing=1.5, wrap=True)
