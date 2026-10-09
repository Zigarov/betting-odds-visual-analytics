"""Scatter plot view — 2D MDS projection of the odds."""

from __future__ import annotations

import plotly.graph_objects as go

RESULT_COLORS = {"H": "#e74c3c", "D": "#dddddd", "A": "#2ecc71"}
OVER_SYMBOLS = {"Over": "circle", "Under": "triangle-up"}

_BG = "#252525"
_AXIS = "khaki"
_SELECT_OUTLINE = "gold"


def _legend_traces() -> list[go.Scatter]:
    items = [
        ("Home", "square", RESULT_COLORS["H"]),
        ("Draw", "square", RESULT_COLORS["D"]),
        ("Away", "square", RESULT_COLORS["A"]),
        ("Over", "circle", "#aaaaaa"),
        ("Under", "triangle-up", "#aaaaaa"),
    ]
    return [
        go.Scatter(
            x=[None], y=[None], mode="markers", name=label,
            marker=dict(symbol=symbol, color=color, size=9),
            hoverinfo="skip", showlegend=True,
        )
        for label, symbol, color in items
    ]


def build_scatter(df, selected_ids=None, uirevision="scatter") -> go.Figure:
    selected = set(selected_ids or [])

    colors = [RESULT_COLORS.get(r, "#888888") for r in df["FTR"]]
    symbols = [OVER_SYMBOLS.get(o, "circle") for o in df["isOver"]]
    line_widths = [2 if rid in selected else 0 for rid in df["row_id"]]

    customdata = df[["row_id", "HomeTeam", "AwayTeam", "Date", "FTR", "isOver"]].values

    main = go.Scatter(
        x=df["x"], y=df["y"], mode="markers",
        marker=dict(
            color=colors, symbol=symbols, size=9,
            line=dict(color=_SELECT_OUTLINE, width=line_widths),
        ),
        customdata=customdata,
        hovertemplate=(
            "<b>%{customdata[1]} – %{customdata[2]}</b><br>"
            "%{customdata[3]}<br>"
            "Result: %{customdata[4]} · %{customdata[5]}"
            "<extra></extra>"
        ),
        showlegend=False, name="",
    )

    fig = go.Figure(data=[main, *_legend_traces()])
    fig.update_layout(
        dragmode="select",
        paper_bgcolor=_BG, plot_bgcolor=_BG,
        font=dict(color="#ffffff"),
        margin=dict(l=30, r=10, t=10, b=30),
        legend=dict(
            x=1, y=0, xanchor="right", yanchor="bottom",
            bgcolor="rgba(0,0,0,0.3)", font=dict(size=10),
        ),
        uirevision=uirevision,
    )
    fig.update_xaxes(zeroline=True, zerolinecolor=_AXIS, gridcolor="#3a3a3a",
                     tickfont=dict(color=_AXIS), showline=False)
    fig.update_yaxes(zeroline=True, zerolinecolor=_AXIS, gridcolor="#3a3a3a",
                     tickfont=dict(color=_AXIS), showline=False)
    return fig
