"""Comparative chart view — implied probability boxplots vs. observed frequency."""

from __future__ import annotations

import numpy as np
import plotly.graph_objects as go

from data.odds_preprocessing import DIM_TO_OUTCOME, ODD_LABELS

_BG = "#252525"
_AXIS = "khaki"


def _frequencies(df) -> dict:
    n = len(df)
    if n == 0:
        return {}
    freq = {}
    ftr_counts = df["FTR"].value_counts(normalize=True)
    for outcome in ("H", "D", "A"):
        freq[outcome] = float(ftr_counts.get(outcome, 0.0))
    over_counts = df["isOver"].value_counts(normalize=True)
    freq["Over"] = float(over_counts.get("Over", 0.0))
    freq["Under"] = float(over_counts.get("Under", 0.0))
    return freq


def build_comparative(df, dims=None) -> go.Figure:
    dims = dims or list(ODD_LABELS)

    if df is None or len(df) < 2:
        fig = go.Figure()
        fig.update_layout(
            paper_bgcolor=_BG, plot_bgcolor=_BG,
            font=dict(color="#ffffff"),
            annotations=[dict(text="Select at least 2 matches",
                              showarrow=False, font=dict(color=_AXIS))],
            margin=dict(l=40, r=10, t=40, b=30),
        )
        return fig

    freq = _frequencies(df)

    fig = go.Figure()
    for dim in dims:
        implied = (1.0 / df[dim]).to_numpy()
        fig.add_trace(go.Box(
            y=implied, name=dim, boxmean="sd",
            marker=dict(color="#dddddd", size=2),
            line=dict(color="#ffffff"),
            fillcolor="#2f2f2f", width=0.5,
            hovertemplate=(
                f"<b>{dim}</b><br>"
                "q1=%{q1:.2f} median=%{median:.2f} q3=%{q3:.2f}"
                "<extra></extra>"
            ),
        ))

    outcomes = [DIM_TO_OUTCOME[d] for d in dims]
    fig.add_trace(go.Scatter(
        x=dims,
        y=[freq.get(o, np.nan) for o in outcomes],
        mode="markers",
        marker=dict(symbol="cross", color="#e74c3c", size=12,
                    line=dict(width=1, color="#e74c3c")),
        name="frequency",
        hovertemplate="freq(%{x}) = %{y:.2f}<extra></extra>",
    ))

    fig.update_layout(
        paper_bgcolor=_BG, plot_bgcolor=_BG,
        font=dict(color="#ffffff"),
        margin=dict(l=40, r=10, t=40, b=30),
        showlegend=False,
        title=dict(text="Implied probability vs. frequency",
                   font=dict(size=13, color="#ffffff"), x=0.5),
        uirevision="comparative",
    )
    fig.update_yaxes(range=[0, 1], gridcolor="#3a3a3a", tickfont=dict(color=_AXIS),
                     zeroline=False)
    fig.update_xaxes(tickfont=dict(color=_AXIS))
    return fig
