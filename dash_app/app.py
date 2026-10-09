"""Odds Visual Analytics — Dash port of the original D3.js tool.

Run standalone:  ``python app.py``  then open http://127.0.0.1:8050

The page is built from three linked views (parallel coordinates, scatter,
comparative chart) wired together with the same Init / Update / Focus
interaction model as the original, here expressed as Dash callbacks over a
shared ``dcc.Store``. To drop this into an existing multi-page Dash app, reuse
``layout`` and ``register_callbacks`` (see the bottom of this file).
"""

from __future__ import annotations

import dash
from dash import (
    ClientsideFunction,
    Dash,
    Input,
    Output,
    State,
    dcc,
    html,
    no_update,
)

from components.comparative_chart import build_comparative
from components.parallel_plot import (
    build_parallel,
    read_constraintranges,
    selected_ids_from_brushes,
)
from components.scatter_plot import build_scatter
from data.preprocessing import ODD_LABELS, load_data

# Loaded once; the views are pure functions of this frame + a selection.
DF = load_data()


# --------------------------------------------------------------------------- #
# Layout
# --------------------------------------------------------------------------- #
def _graph(graph_id, area):
    return dcc.Graph(
        id=graph_id,
        style={"gridArea": area, "height": "100%", "width": "100%"},
        config={"displayModeBar": True, "displaylogo": False, "responsive": True,
                "modeBarButtonsToRemove": ["lasso2d", "autoScale2d"]},
    )


layout = html.Div(
    [
        dcc.Store(id="selected-ids", data=[]),
        dcc.Store(id="focus-ids", data=None),
        html.Div(
            [
                html.Span("Odds Visual Analytics", className="app-title"),
                html.Button("Focus on selection", id="focus-btn", n_clicks=0,
                            className="app-btn"),
                html.Button("Exit focus", id="exit-focus-btn", n_clicks=0,
                            className="app-btn"),
                html.Button("Reset", id="reset-btn", n_clicks=0, className="app-btn"),
                html.Span(id="selection-info", className="app-info"),
            ],
            className="toolbar",
        ),
        html.Div(
            [
                _graph("parallel-plot", "parallel"),
                _graph("scatter-plot", "scatter"),
                _graph("comparative-chart", "comparative"),
            ],
            className="viz-grid",
        ),
    ],
    className="odds-page",
)


# --------------------------------------------------------------------------- #
# Callbacks
# --------------------------------------------------------------------------- #
def register_callbacks(app):
    # --- Update(): brushing in scatter OR parallel -> shared selection ------ #
    @app.callback(
        Output("selected-ids", "data"),
        Input("scatter-plot", "selectedData"),
        Input("parallel-plot", "restyleData"),
        Input("reset-btn", "n_clicks"),
        State("parallel-plot", "figure"),
        prevent_initial_call=True,
    )
    def update_selection(scatter_sel, _parallel_restyle, _reset, parallel_fig):
        trigger = dash.callback_context.triggered_id

        if trigger == "reset-btn":
            return []

        if trigger == "scatter-plot":
            if not scatter_sel or not scatter_sel.get("points"):
                # Figure re-render clears selectedData -> ignore, keep selection.
                return no_update
            return [int(p["customdata"][0]) for p in scatter_sel["points"]]

        if trigger == "parallel-plot":
            cranges = read_constraintranges(parallel_fig)
            return selected_ids_from_brushes(DF, cranges)

        return no_update

    # --- Focus(): drill-down parallel + scatter onto the current selection --- #
    @app.callback(
        Output("focus-ids", "data"),
        Input("focus-btn", "n_clicks"),
        Input("exit-focus-btn", "n_clicks"),
        Input("reset-btn", "n_clicks"),
        State("selected-ids", "data"),
        prevent_initial_call=True,
    )
    def update_focus(_focus, _exit, _reset, selected_ids):
        trigger = dash.callback_context.triggered_id
        # Reset and Exit focus both leave the drill-down; Reset additionally
        # clears the selection (handled in update_selection), Exit keeps it.
        if trigger in ("reset-btn", "exit-focus-btn"):
            return None
        if trigger == "focus-btn" and selected_ids:
            return selected_ids
        return no_update

    # --- Structural rebuild of scatter + parallel (focus / reset / exit) ---- #
    # These change *which* points are shown (subset + axis rescaling), so they
    # need a full server rebuild. Selection-only highlight is handled clientside
    # below, with no server round-trip.
    @app.callback(
        Output("parallel-plot", "figure"),
        Output("scatter-plot", "figure"),
        Input("focus-ids", "data"),
        Input("reset-btn", "n_clicks"),
        Input("focus-btn", "n_clicks"),
        Input("exit-focus-btn", "n_clicks"),
        State("selected-ids", "data"),
        State("parallel-plot", "figure"),
    )
    def render_structural(focus_ids, reset_clicks, focus_clicks, exit_clicks,
                          selected_ids, parallel_fig):
        selected_ids = selected_ids or []

        # Reset / Focus / Exit-focus drop the on-screen brushes: clear the
        # parcoords axis brushes and bump the uirevision token so Plotly also
        # clears the scatter box-select. (Selection updates never reach this
        # callback, so here a re-render always means a structural change.)
        ctx = dash.callback_context
        structural = any(
            t["prop_id"].startswith(("reset-btn", "focus-btn", "exit-focus-btn"))
            for t in ctx.triggered
        )
        ui_token = f"r{reset_clicks or 0}-f{focus_clicks or 0}-e{exit_clicks or 0}"

        # Both views drill down to the focus subset (axes rescale).
        focus_df = DF[DF["row_id"].isin(focus_ids)] if focus_ids else DF

        cranges = {} if structural else read_constraintranges(parallel_fig)
        parallel = build_parallel(focus_df, ODD_LABELS, selected_ids, cranges,
                                  uirevision=ui_token)
        scatter = build_scatter(focus_df, selected_ids, uirevision=ui_token)
        return parallel, scatter

    # --- Clientside highlight: selection -> outline / line colour ----------- #
    # Runs entirely in the browser, so dragging a box-select recolours the linked
    # views instantly (no server round-trip). The functions live in
    # assets/odds_clientside.js under the "odds" namespace.
    app.clientside_callback(
        ClientsideFunction(namespace="odds", function_name="highlightScatter"),
        Output("scatter-plot", "figure", allow_duplicate=True),
        Input("selected-ids", "data"),
        State("scatter-plot", "figure"),
        prevent_initial_call=True,
    )

    app.clientside_callback(
        ClientsideFunction(namespace="odds", function_name="highlightParallel"),
        Output("parallel-plot", "figure", allow_duplicate=True),
        Input("selected-ids", "data"),
        State("parallel-plot", "figure"),
        prevent_initial_call=True,
    )

    # --- Comparative chart + info (server-side, on the selected subset) ------ #
    @app.callback(
        Output("comparative-chart", "figure"),
        Output("selection-info", "children"),
        Input("selected-ids", "data"),
        Input("focus-ids", "data"),
    )
    def render_comparative(selected_ids, focus_ids):
        selected_ids = selected_ids or []
        focus_df = DF[DF["row_id"].isin(focus_ids)] if focus_ids else DF

        # Selected subset if any, else the focus subset (full dataset baseline).
        if selected_ids:
            comp_df = DF[DF["row_id"].isin(selected_ids)]
        else:
            comp_df = focus_df
        comparative = build_comparative(comp_df, ODD_LABELS)

        focus_tag = f" · focus on {len(focus_ids)}" if focus_ids else ""
        info = (f"{len(selected_ids)} selected / {len(DF)}{focus_tag}"
                if selected_ids else f"{len(DF)} matches{focus_tag}")
        return comparative, info


# --------------------------------------------------------------------------- #
# Standalone entry point
# --------------------------------------------------------------------------- #
def create_app() -> Dash:
    app = Dash(__name__, title="Odds Visual Analytics")
    app.layout = layout
    register_callbacks(app)
    return app


app = create_app()
server = app.server  # for gunicorn / WSGI deployment

if __name__ == "__main__":
    app.run(debug=True)
