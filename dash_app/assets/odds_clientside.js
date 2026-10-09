/* Clientside highlight callbacks for the Odds Visual Analytics views.
 *
 * Defined as a named namespace (window.dash_clientside.odds) and referenced from
 * app.py via ClientsideFunction(namespace="odds", function_name=...). This is
 * more robust than inline clientside functions, which Dash injects into a
 * runtime-generated bundle and can go stale on hot-reload / browser caching
 * (symptom: "dc[namespace][function_name] is not a function").
 *
 * Both run entirely in the browser, so a box-select / brush recolours the linked
 * views instantly with no server round-trip.
 */
window.dash_clientside = Object.assign({}, window.dash_clientside, {
    odds: {
        // Scatter: set the per-point outline width on the single point trace
        // (data[0]) -> 2 (gold outline) for selected, 0 otherwise.
        highlightScatter: function (selected, fig) {
            if (!fig || !fig.data || !fig.data.length) {
                return window.dash_clientside.no_update;
            }
            var sel = new Set(selected || []);
            var cd = fig.data[0].customdata || [];
            var widths = cd.map(function (row) { return sel.has(row[0]) ? 2 : 0; });
            var out = Object.assign({}, fig);
            out.data = fig.data.slice();
            out.data[0] = Object.assign({}, fig.data[0]);
            out.data[0].marker = Object.assign({}, fig.data[0].marker);
            out.data[0].marker.line = Object.assign({}, fig.data[0].marker.line);
            out.data[0].marker.line.width = widths;
            return out;
        },

        // Parallel: recolour the single parcoords trace by mapping the selection
        // onto the row_id order stashed in layout.meta.row_ids.
        highlightParallel: function (selected, fig) {
            if (!fig || !fig.data || !fig.data.length) {
                return window.dash_clientside.no_update;
            }
            var sel = new Set(selected || []);
            var rowIds = (fig.layout && fig.layout.meta && fig.layout.meta.row_ids) || [];
            var flags = rowIds.map(function (rid) { return sel.has(rid) ? 1 : 0; });
            var out = Object.assign({}, fig);
            out.data = fig.data.slice();
            out.data[0] = Object.assign({}, fig.data[0]);
            out.data[0].line = Object.assign({}, fig.data[0].line);
            out.data[0].line.color = flags;
            return out;
        }
    }
});
