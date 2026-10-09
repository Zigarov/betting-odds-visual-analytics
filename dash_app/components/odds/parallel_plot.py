"""Parallel coordinates view — the 5 odds dimensions."""

from __future__ import annotations

import plotly.graph_objects as go

from data.odds_preprocessing import ODD_LABELS  # noqa: F401

_BG = "#252525"
_STEEL = "#4682b4"
_ORANGE = "#ffa500"


def build_parallel(df, dims=None, selected_ids=None, constraintranges=None,
                   uirevision="parallel") -> go.Figure:
    dims = dims or list(ODD_LABELS)
    selected = set(selected_ids or [])
    constraintranges = constraintranges or {}

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
        margin=dict(l=60, r=40, t=50, b=40),
        uirevision=uirevision,
        meta=dict(row_ids=df["row_id"].tolist()),
    )
    return fig


def read_constraintranges(parallel_figure) -> dict:
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
    if cr is None:
        return True
    bands = cr if isinstance(cr[0], (list, tuple)) else [cr]
    return any(lo <= value <= hi for lo, hi in bands)


def selected_ids_from_brushes(df, constraintranges: dict):
    if not constraintranges:
        return []
    mask = None
    for dim, cr in constraintranges.items():
        col = df[dim].map(lambda v, cr=cr: _within(v, cr))
        mask = col if mask is None else (mask & col)
    if mask is None:
        return []
    return df.loc[mask, "row_id"].tolist()
