# Odds Visual Analytics — Dash port

Migrazione in Dash (Python) del tool D3.js a 3 viste collegate. Pensata per essere
**copiata dentro il tuo progetto Dash esistente**, ma è anche eseguibile standalone.

## Esecuzione standalone

```bash
pip install -r requirements.txt
python app.py
# http://127.0.0.1:8050
```

## Struttura

```
dash_migration/
├── app.py                       # layout + callback (linking/brushing, Focus, Reset) + entry point
├── data/
│   ├── preprocessing.py         # load_data(): CSV -> df con x, y, isOver, row_id (MDS via sklearn opz.)
│   └── odds23.csv               # dataset (Serie A 22/23, ~1826 partite)
├── components/
│   ├── parallel_plot.py         # go.Parcoords + helper per leggere i brush degli assi
│   ├── scatter_plot.py          # go.Scatter (proiezione MDS), box-select, outline selezione
│   └── comparative_chart.py     # go.Box prob. implicite + croce frequenza osservata
└── assets/
    └── odds_analytics.css       # tema scuro + layout 2x2 (port di index.scss)
```

## Le 3 viste e le interazioni

| Vista | Origine D3 | Note |
|-------|-----------|------|
| **Parallel coordinates** | `parallel-plot.js` | Brushing nativo sugli assi (`constraintrange`) come selezione. Linee arancioni = selezionate. |
| **Scatter (MDS 2D)** | `scatter-plot.js` | Forma = Over/Under, colore = esito (H/D/A). **Box-select** per selezionare; punti selezionati con bordo oro. |
| **Comparative chart** | `comparative-chart.js` | Boxplot delle probabilità implicite (`1/quota`) + croce rossa = frequenza reale dell'esito. Ricalcolata sul subset selezionato. |

Modello di interazione (Init / Update / Focus dell'originale → callback Dash su `dcc.Store`):

- **Update** — brushing in scatter *o* parallel → `selected-ids` → evidenzia le viste + ricalcola la comparative chart sul subset.
- **Focus** — pulsante *"Focus on selection"*: ridisegna la parallel plot sul solo subset (riscala gli assi).
- **Reset** — pulsante *Reset*: torna al dataset completo.

## Come integrarlo nel tuo progetto Dash

1. Copia `data/`, `components/`, e il contenuto di `assets/` nelle cartelle corrispondenti del tuo progetto.
2. In `app.py` le parti riutilizzabili sono **`layout`** e **`register_callbacks(app)`**:
   - In un'app multi-pagina: usa `layout` come `layout` della pagina e chiama `register_callbacks(app)` una volta in fase di setup.
   - Adatta gli **import path** (`from data.preprocessing import ...`, `from components... import ...`) alla struttura dei package del tuo progetto.
3. `assets/odds_analytics.css` viene caricato automaticamente da Dash (cartella `assets/`).

## Note tecniche / scelte

- **MDS**: di default si usano le colonne `x, y` già nel CSV (fedeltà 1:1 con l'originale). Passa `load_data(recompute=True)` per ricalcolare la proiezione con `sklearn.manifold.MDS`.
- **Anti-loop callback**: `render_views` riscrive le figure; quando ciò azzera `selectedData`/`restyleData`, la callback di selezione fa `no_update` (vedi guardie in `app.py`). I brush della parallel plot vengono preservati rileggendo i `constraintrange` dalla figura corrente.
- **Selezione stabile**: ogni riga ha un `row_id` propagato nel `customdata` dello scatter, così le selezioni sopravvivono ai re-render.
- **Highlight clientside**: l'evidenziazione della selezione (bordo oro sullo scatter, linee arancioni sul parallel) è gestita da callback clientside in `assets/odds_clientside.js` (namespace `odds`), senza round-trip al server. La comparative chart resta server-side.

## Idee di miglioramento (non ancora implementate)

Filtri per squadra/giornata, scelta della tecnica di riduzione (t-SNE/UMAP/PCA),
tabella di dettaglio (`dash_table.DataTable`), export CSV della selezione, switch
dataset (`oddsITA23.csv`). Vedi `../MIGRATION_PLAN.md` §5.
