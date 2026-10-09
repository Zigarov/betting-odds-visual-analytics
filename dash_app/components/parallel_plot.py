"""Parallel coordinates view — the 5 odds dimensions.

Port of ``parallel-plot.js`` using Plotly ``go.Parcoords``:
  * one vertical axis per odds dimension
  * native axis brushing (``constraintrange``) replaces ``d3.brushY``
  * line colour encodes the shared selection (orange = selected, steel = not),
    replacing ``highlightParallelPlot``
  * "Focus" (drill-down) is handled upstream by passing a filtered ``df`` so the
    axis ranges rescale to the subset, mirroring the original ``Focus()``.

Helpers are provided to read the current brush state out of a figure dict and
to translate it into selected ``row_id`` values, so the callback layer can use
the parcoords as a selection *source* too.
"""

from __future__ import annotations

import plotly.graph_objects as go

from data.preprocessing import ODD_LABELS  # noqa: F401  (re-export convenience)

_BG = "#252525"
_STEEL = "#4682b4"
_ORANGE = "#ffa500"


def build_parallel(df, dims=None, selected_ids=None, constraintranges=None,
                   uirevision="parallel") -> go.Figure:
    """Build the parallel coordinates figure.

    Args:
        df: dataframe to plot (already filtered to the focus subset if any).
        dims: odds dimensions (defaults to the canonical 5).
        selected_ids: row_ids to highlight in orange.
        constraintranges: optional {dim: range} to re-apply existing brushes so
            they survive a programmatic re-render.
        uirevision: UI-state token. Keep it constant to preserve the axis brushes
            across re-renders; change it (e.g. on Reset) to clear them.
    """
    dims = dims or list(ODD_LABELS)
    selected = set(selected_ids or [])
    constraintranges = constraintranges or {}

    # 1 = selected, 0 = not. Drives the line colour via the colourscale below.
    sel_flag = [1 if rid in selected else 0 for rid in df["row_id"]]

    dimensions = []
    for dim in dims:
        d = dict(label=dim, values=df[dim].tolist())
        cr = constraintranges.get(dim)
        if cr is not None:
            d["constraintrange"] = cr
        dimensions.append(d)

    fig = go.Figure(
        data=go.Parcoords(
            line=dict(
                color=sel_flag,
                colorscale=[[0, _STEEL], [1, _ORANGE]],
                cmin=0,
                cmax=1,
            ),
            dimensions=dimensions,
            labelfont=dict(color="khaki", size=12),
            tickfont=dict(color="khaki", size=10),
            unselected=dict(line=dict(opacity=0.3)),
        )
    )
    fig.update_layout(
        paper_bgcolor=_BG,
        plot_bgcolor=_BG,
        font=dict(color="#ffffff"),
        # Generous top/bottom margins so the axis labels and tick values stay
        # inside the container instead of spilling over the grid cell border.
        margin=dict(l=60, r=40, t=50, b=40),
        uirevision=uirevision,  # keep brushes across colour-only re-renders
        # Expose the row_id order so the clientside highlight callback can map a
        # selection back onto the lines without a server round-trip. Parcoords has
        # no per-line customdata, so we stash it in layout.meta.
        meta=dict(row_ids=df["row_id"].tolist()),
    )
    return fig


def read_constraintranges(parallel_figure) -> dict:
    """Extract the current axis brushes from a parcoords figure dict.

    Returns {dim_label: constraintrange}. ``constraintrange`` may be a single
    ``[lo, hi]`` pair or a list of such pairs (multiple brushed bands).
    """
    out: dict = {}
    if not parallel_figure:
        return out
    try:
        dims = parallel_figure["data"][0]["dimensions"]
    except (KeyError, IndexError, TypeError):
        return out
    for d in dims:
        cr = d.get("constraintrange")
        if cr is not None:
            out[d.get("label")] = cr
    return out


def _within(value, cr) -> bool:
    """True if ``value`` falls inside the constraintrange ``cr`` (single band or
    list of bands)."""
    if cr is None:
        return True
    # Nested list of [lo, hi] bands, or a single [lo, hi].
    bands = cr if isinstance(cr[0], (list, tuple)) else [cr]
    return any(lo <= value <= hi for lo, hi in bands)


def selected_ids_from_brushes(df, constraintranges: dict):
    """Row_ids whose every brushed dimension lies within its constraintrange.

    Mirrors ``brushedY`` in the original: a row is kept only if it satisfies
    every active brush. No brushes -> empty selection (nothing brushed).
    """
    if not constraintranges:
        return []
    mask = None
    for dim, cr in constraintranges.items():
        col = df[dim].map(lambda v, cr=cr: _within(v, cr))
        mask = col if mask is None else (mask & col)
    if mask is None:
        return []
    return df.loc[mask, "row_id"].tolist()
