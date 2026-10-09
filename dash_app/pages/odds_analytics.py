"""Odds Visual Analytics — pagina multi-pagina Dash.

Layout e callback delle 3 viste collegate (parallel coordinates, scatter MDS,
comparative chart). Usa il pattern Dash 2.x con @callback e clientside_callback
standalone, senza importare l'istanza app (nessun circular import).

Copia nel tuo progetto:
  - questo file        → pages/odds_analytics.py
  - components/odds/   → components/odds/
  - data/odds_preprocessing.py + data/odds23.csv → data/
  - assets/odds_analytics.css + assets/odds_clientside.js → assets/
"""

from __future__ import annotations

import dash
from dash import (
    ClientsideFunction,
    Input,
    Output,
    State,
    callback,
    clientside_callback,
    dcc,
    html,
    no_update,
)

from components.odds.comparative_chart import build_comparative
from components.odds.parallel_plot import (
    build_parallel,
    read_constraintranges,
    selected_ids_from_brushes,
)
from components.odds.scatter_plot import build_scatter
from data.odds_preprocessing import ODD_LABELS, load_data

dash.register_page(__name__, path="/odds-analytics", name="Odds Analytics")

# Caricato una volta sola al primo import del modulo.
DF = load_data()


# --------------------------------------------------------------------------- #
# Layout
# --------------------------------------------------------------------------- #
def _graph(graph_id, area):
    return dcc.Graph(
        id=graph_id,
        style={"gridArea": area, "height": "100%", "width": "100%"},
        config={
            "displayModeBar": True,
            "displaylogo": False,
            "responsive": True,
            "modeBarButtonsToRemove": ["lasso2d", "autoScale2d"],
        },
    )


layout = html.Div(
    [
        dcc.Store(id="odds-selected-ids", data=[]),
        dcc.Store(id="odds-focus-ids", data=None),
        html.Div(
            [
                html.Span("Odds Visual Analytics", className="app-title"),
                html.Button("Focus on selection", id="odds-focus-btn", n_clicks=0,
                            className="app-btn"),
                html.Button("Exit focus", id="odds-exit-focus-btn", n_clicks=0,
                            className="app-btn"),
                html.Button("Reset", id="odds-reset-btn", n_clicks=0,
                            className="app-btn"),
                html.Span(id="odds-selection-info", className="app-info"),
            ],
            className="toolbar",
        ),
        html.Div(
            [
                _graph("odds-parallel-plot", "parallel"),
                _graph("odds-scatter-plot", "scatter"),
                _graph("odds-comparative-chart", "comparative"),
            ],
            className="viz-grid",
        ),
    ],
    className="odds-page",
)


# --------------------------------------------------------------------------- #
# Callbacks
# --------------------------------------------------------------------------- #

# --- Update(): brushing in scatter OR parallel -> selezione condivisa ------- #
@callback(
    Output("odds-selected-ids", "data"),
    Input("odds-scatter-plot", "selectedData"),
    Input("odds-parallel-plot", "restyleData"),
    Input("odds-reset-btn", "n_clicks"),
    State("odds-parallel-plot", "figure"),
    prevent_initial_call=True,
)
def update_selection(scatter_sel, _parallel_restyle, _reset, parallel_fig):
    trigger = dash.callback_context.triggered_id

    if trigger == "odds-reset-btn":
        return []

    if trigger == "odds-scatter-plot":
        if not scatter_sel or not scatter_sel.get("points"):
            # Il re-render della figura azzera selectedData -> ignora.
            return no_update
        return [int(p["customdata"][0]) for p in scatter_sel["points"]]

    if trigger == "odds-parallel-plot":
        cranges = read_constraintranges(parallel_fig)
        return selected_ids_from_brushes(DF, cranges)

    return no_update


# --- Focus(): drill-down sul subset selezionato ----------------------------- #
@callback(
    Output("odds-focus-ids", "data"),
    Input("odds-focus-btn", "n_clicks"),
    Input("odds-exit-focus-btn", "n_clicks"),
    Input("odds-reset-btn", "n_clicks"),
    State("odds-selected-ids", "data"),
    prevent_initial_call=True,
)
def update_focus(_focus, _exit, _reset, selected_ids):
    trigger = dash.callback_context.triggered_id
    if trigger in ("odds-reset-btn", "odds-exit-focus-btn"):
        return None
    if trigger == "odds-focus-btn" and selected_ids:
        return selected_ids
    return no_update


# --- Rebuild strutturale di scatter + parallel (focus / reset / exit) ------- #
@callback(
    Output("odds-parallel-plot", "figure"),
    Output("odds-scatter-plot", "figure"),
    Input("odds-focus-ids", "data"),
    Input("odds-reset-btn", "n_clicks"),
    Input("odds-focus-btn", "n_clicks"),
    Input("odds-exit-focus-btn", "n_clicks"),
    State("odds-selected-ids", "data"),
    State("odds-parallel-plot", "figure"),
)
def render_structural(focus_ids, reset_clicks, focus_clicks, exit_clicks,
                      selected_ids, parallel_fig):
    selected_ids = selected_ids or []

    ctx = dash.callback_context
    structural = any(
        t["prop_id"].startswith(("odds-reset-btn", "odds-focus-btn", "odds-exit-focus-btn"))
        for t in ctx.triggered
    )
    ui_token = f"r{reset_clicks or 0}-f{focus_clicks or 0}-e{exit_clicks or 0}"

    focus_df = DF[DF["row_id"].isin(focus_ids)] if focus_ids else DF

    cranges = {} if structural else read_constraintranges(parallel_fig)
    parallel = build_parallel(focus_df, ODD_LABELS, selected_ids, cranges,
                              uirevision=ui_token)
    scatter = build_scatter(focus_df, selected_ids, uirevision=ui_token)
    return parallel, scatter


# --- Highlight clientside: selezione -> bordo/colore linee (no server) ------ #
clientside_callback(
    ClientsideFunction(namespace="odds", function_name="highlightScatter"),
    Output("odds-scatter-plot", "figure", allow_duplicate=True),
    Input("odds-selected-ids", "data"),
    State("odds-scatter-plot", "figure"),
    prevent_initial_call=True,
)

clientside_callback(
    ClientsideFunction(namespace="odds", function_name="highlightParallel"),
    Output("odds-parallel-plot", "figure", allow_duplicate=True),
    Input("odds-selected-ids", "data"),
    State("odds-parallel-plot", "figure"),
    prevent_initial_call=True,
)


# --- Comparative chart + info (server-side, sul subset selezionato) --------- #
@callback(
    Output("odds-comparative-chart", "figure"),
    Output("odds-selection-info", "children"),
    Input("odds-selected-ids", "data"),
    Input("odds-focus-ids", "data"),
)
def render_comparative(selected_ids, focus_ids):
    selected_ids = selected_ids or []
    focus_df = DF[DF["row_id"].isin(focus_ids)] if focus_ids else DF

    comp_df = DF[DF["row_id"].isin(selected_ids)] if selected_ids else focus_df
    comparative = build_comparative(comp_df, ODD_LABELS)

    focus_tag = f" · focus on {len(focus_ids)}" if focus_ids else ""
    info = (f"{len(selected_ids)} selected / {len(DF)}{focus_tag}"
            if selected_ids else f"{len(DF)} matches{focus_tag}")
    return comparative, info
