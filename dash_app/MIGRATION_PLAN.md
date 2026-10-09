# Piano di Migrazione: da D3.js a Dash (Python)

> Migrazione del tool **Visual Analytics in Sports Betting** dall'attuale implementazione D3.js/Webpack a componenti **Dash**, per l'integrazione in un progetto Python esistente.

---

## 1. Analisi della codebase attuale

### 1.1 Stack tecnologico
| Ambito | Tecnologia |
|--------|-----------|
| Visualizzazioni | D3.js v7 |
| Riduzione dimensionalità | `@saehrimnir/druidjs` (MDS) |
| Bundling | Webpack 5 + Babel |
| Stili | SCSS / PostCSS |
| Dati | CSV statico (`dataset/odds23.csv`, ~1826 righe) |

### 1.2 Struttura dati
Il dataset (`odds23.csv`) contiene partite di Serie A 2022/23. Colonne rilevanti:

- **Anagrafica**: `Div, Date, Time, HomeTeam, AwayTeam`
- **Risultato**: `HG, AG` (gol), `FTR` (esito: `H`/`D`/`A`)
- **Quote medie** (le 5 dimensioni analizzate): `AvgH, AvgD, AvgA, AvgO, AvgU`
  - `H`=Home win, `D`=Draw, `A`=Away win, `O`=Over 2.5, `U`=Under 2.5
- **Pre-calcolate**: `x, y` (proiezione MDS 2D), `isOver` (`Over`/`Under` se `HG+AG > 2.5`)

### 1.3 Architettura delle viste (3 viste collegate)

Layout a 3 pannelli (vedi `index.scss`):

```
┌──────────────────────────┬──────────────┐
│  Parallel Plot (69×49%)  │              │
├──────────────────────────┤ Comparative  │
│  Scatter Plot  (69×49%)  │ Chart (30%)  │
└──────────────────────────┴──────────────┘
```

| Vista | File | Descrizione |
|-------|------|-------------|
| **Parallel Coordinates** | `parallel-plot.js` | 5 assi verticali (le 5 quote). Brush verticale per asse → filtra. Doppio-click → *Focus* (drill-down). |
| **Scatter Plot** | `scatter-plot.js` | Proiezione MDS 2D. Forma = Over(cerchio)/Under(triangolo), colore = esito (rosso=H, bianco=D, verde=A). Brush 2D → seleziona; doppio-click dentro → *Focus*, fuori → *reset*. |
| **Comparative Chart** | `comparative-chart.js` | Boxplot delle **probabilità implicite** (`1/quota`) per ogni dimensione + simbolo croce per la **frequenza** osservata dell'esito. Tooltip con statistiche. |

### 1.4 Modello di interazione (cuore del tool)

Tre funzioni globali in `index.js` orchestrano il *linking & brushing*:

- **`Init()`** — disegna tutte e 3 le viste con il dataset completo (stato di reset).
- **`Update(selectedDataIndex)`** — evidenzia gli elementi selezionati nelle 3 viste e ridisegna la Comparative Chart sul **solo** sottoinsieme selezionato.
- **`Focus(selectedDataIndex)`** — drill-down: ridisegna la Parallel Plot usando solo i dati selezionati (riscala gli assi sul sottoinsieme).

Il brushing in una vista (parallel o scatter) propaga la selezione alle altre tramite l'array condiviso di indici `selectedDataIndex`.

### 1.5 Preprocessing (`preprocessing.js`)
- `normalizeData` — normalizzazione Z-score sulle 5 quote.
- `reduceData` — MDS (druid.js) → coordinate 2D `x, y`.
- Calcolo `isOver`. Output già materializzato nel CSV (quindi runtime usa `preprocessed=true`).

---

## 2. Architettura target in Dash

### 2.1 Decisione chiave: come rendere le viste

Tre opzioni, in ordine di raccomandazione:

| Opzione | Pro | Contro | Verdetto |
|---------|-----|--------|----------|
| **A. Plotly nativo** (`go.Parcoords`, `go.Scatter`, `go.Box`) + callback Dash | Integrazione perfetta con Dash, selezione/crossfilter out-of-the-box, manutenibile in Python, responsive | Si perde un po' del controllo fine sul rendering D3; la parallel plot Plotly ha un brushing leggermente diverso | ✅ **Raccomandata** |
| B. Riuso del codice D3 come componente custom / clientside callback | Pixel-perfect rispetto all'originale | Doppia manutenzione JS+Python, perde i vantaggi di Dash, bundling complesso | Solo se il rendering deve essere identico |
| C. `dash-svg` / wrapper React custom | Via di mezzo | Effort di sviluppo alto | Sconsigliata |

> **Strategia consigliata**: Opzione **A** con Plotly, replicando le interazioni via callback Dash. È la scelta più nativa e quella che meglio "eredita e migliora" le funzionalità in ambiente Python.

### 2.2 Struttura file proposta (dentro il progetto Dash)

```
your_dash_project/
├── pages/
│   └── odds_analytics.py        # layout della pagina (registra la route)
├── components/
│   ├── parallel_plot.py         # factory figura go.Parcoords
│   ├── scatter_plot.py          # factory figura go.Scatter (proiezione MDS)
│   └── comparative_chart.py     # factory figura boxplot + frequenze
├── callbacks/
│   └── odds_callbacks.py        # linking & brushing tra le viste
├── data/
│   ├── preprocessing.py         # MDS + isOver (sklearn)
│   └── odds23.csv               # dataset (copiato dal progetto attuale)
└── assets/
    └── odds_analytics.css       # tema scuro (port di index.scss)
```

### 2.3 Mappatura tecnologica

| Attuale (JS) | Target (Python/Dash) |
|--------------|----------------------|
| `d3.csv` / import CSV | `pandas.read_csv` |
| `druid.MDS` | `sklearn.manifold.MDS` |
| `d3.scaleLinear/scaleBand` | gestite internamente da Plotly |
| `d3.brush` / `d3.brushY` | `selectedData` / `relayoutData` nei callback |
| `d3.quantile/mean/deviation` | `numpy` / `pandas.describe()` |
| Funzioni `Init/Update/Focus` | Callback Dash con `dcc.Store` per lo stato |
| Tooltip DOM manuale | `hovertemplate` Plotly |
| `index.scss` | `assets/*.css` (Dash carica `assets/` in automatico) |

---

## 3. Migrazione vista per vista

### 3.1 Preprocessing → `data/preprocessing.py`
```python
from sklearn.preprocessing import StandardScaler
from sklearn.manifold import MDS

ODD_LABELS = ["AvgH", "AvgD", "AvgA", "AvgO", "AvgU"]

def preprocess(df):
    X = StandardScaler().fit_transform(df[ODD_LABELS])
    coords = MDS(n_components=2, random_state=42).fit_transform(X)
    df["x"], df["y"] = coords[:, 0], coords[:, 1]
    df["isOver"] = (df["HG"] + df["AG"] > 2.5).map({True: "Over", False: "Under"})
    return df
```
> Nota: l'output MDS non sarà identico a druid.js (algoritmi/seed diversi) ma equivalente. In alternativa si può usare direttamente la colonna `x,y` già presente nel CSV per replicare esattamente l'originale.

### 3.2 Parallel Coordinates → `go.Parcoords`
- Un asse (`dimensions`) per ognuna delle 5 quote.
- Il **brushing nativo** di Parcoords (`constraintrange`) sostituisce `d3.brushY`. La selezione si legge via callback `restyleData`/`relayoutData`.
- *Focus* (drill-down): callback che ricalcola i `range` degli assi sul sottoinsieme selezionato.

### 3.3 Scatter Plot → `go.Scatter` (mode markers)
- `x=df.x, y=df.y`.
- **Forma**: `marker.symbol` = `circle` (Over) / `triangle-up` (Under).
- **Colore**: `H`→rosso, `D`→bianco/grigio, `A`→verde.
- Selezione via **box select** Plotly (`dragmode="select"`), letta da `selectedData`.
- Legenda nativa Plotly (sostituisce la legenda disegnata a mano).

### 3.4 Comparative Chart → `go.Box` + marker frequenza
- Per ogni dimensione: boxplot delle probabilità implicite `1/quota`.
- Sovrapporre un marker a croce (`symbol="cross"`) all'altezza della **frequenza osservata** dell'esito corrispondente — questa è la feature analitica più interessante (confronto probabilità implicita vs. frequenza reale → individua value bet).
- Tooltip statistiche via `hovertemplate`.

### 3.5 Layout → `pages/odds_analytics.py`
- `dbc.Row`/`dbc.Col` (o CSS grid) per replicare il layout 2×2.
- 3 × `dcc.Graph` + 1 × `dcc.Store(id="selected-indices")` per condividere la selezione.

---

## 4. Modello di interazione in Dash

Lo stato condiviso (`selectedDataIndex`) diventa un `dcc.Store`. Le tre funzioni globali diventano callback:

| Funzione JS | Implementazione Dash |
|-------------|----------------------|
| `Init()` | Stato iniziale dei callback / pulsante "Reset" che svuota lo Store |
| `Update(idx)` | Callback: input = `selectedData` di scatter **o** parallel → output = `figure` aggiornata delle 3 viste + Store |
| `Focus(idx)` | Callback su doppio-click/pulsante → ricalcola i range della parallel plot sul sottoinsieme |

Flusso (linking & brushing):
```
[Brush su Scatter o Parallel]
        │ selectedData / restyleData
        ▼
[Callback Update] ──► aggiorna Store(selected-indices)
        │
        ├──► evidenzia punti Scatter
        ├──► evidenzia linee Parallel
        └──► ridisegna Comparative Chart sul subset
```

> **Attenzione cross-filtering bidirezionale**: in Dash più input che scrivono lo stesso output richiedono `ctx.triggered` per capire quale vista ha originato l'evento ed evitare loop. Usare `dash.callback_context`.

---

## 5. Funzionalità da ereditare e migliorare

**Da preservare (1:1):**
- 3 viste collegate (parallel / scatter / comparative).
- Brushing e propagazione della selezione.
- Confronto probabilità implicita vs. frequenza reale (value betting).
- Drill-down (Focus) e reset (Init).
- Tema scuro.

**Miglioramenti possibili in Dash:**
1. **Filtri interattivi** (`dcc.Dropdown`): per squadra, giornata, esito — non presenti nell'originale.
2. **MDS parametrico**: selettore per cambiare tecnica di riduzione (MDS / t-SNE / UMAP / PCA) ricalcolata server-side.
3. **Tooltip ricchi**: mostrare nome partita, data, quote e risultato all'hover sui punti.
4. **Tabella dettaglio** (`dash_table.DataTable`) sotto le viste con le righe selezionate.
5. **Dataset multipli**: switch tra campionati/stagioni (`oddsITA23.csv` già presente).
6. **Export**: pulsante per scaricare la selezione come CSV (sostituisce `csvDownload`).
7. **Responsive**: `dcc.Graph` con `responsive=True` (risolve i problemi di `clientWidth` fissi dell'originale).
8. **Caching**: pre-calcolo MDS con `@functools.lru_cache` o file parquet per evitare ricalcoli.

---

## 6. Piano di esecuzione a fasi

| Fase | Obiettivo | Output |
|------|-----------|--------|
| **0. Setup** | Aggiungere `dash`, `pandas`, `scikit-learn`, `plotly` al progetto; copiare il CSV; verificare la route della pagina | Pagina vuota raggiungibile |
| **1. Dati** | Port di `preprocessing.py` (MDS + isOver); verificare coerenza con le colonne `x,y` esistenti | DataFrame pronto |
| **2. Viste statiche** | Le 3 figure Plotly renderizzate sul dataset completo, layout 2×2, tema scuro | Pagina "read-only" funzionante |
| **3. Linking & brushing** | `dcc.Store` + callback `Update`; selezione scatter↔parallel↔comparative | Viste collegate |
| **4. Focus & Reset** | Drill-down della parallel plot + pulsante reset | Parità funzionale con l'originale |
| **5. Miglioramenti** | Filtri, tooltip ricchi, tabella dettaglio, export (sezione 5) | Versione migliorata |
| **6. Polish & integrazione** | Stili, responsive, integrazione con la navigazione del progetto Dash | Pagina integrata |

---

## 7. Rischi e punti di attenzione

| Rischio | Mitigazione |
|---------|-------------|
| **MDS non riproducibile** rispetto a druid.js | Usare le colonne `x,y` già nel CSV, oppure fissare `random_state` e accettare la differenza |
| **Parcoords brushing** meno flessibile del brush D3 custom | Valutare `constraintrange`; se insufficiente, fallback su filtri espliciti |
| **Loop nei callback** bidirezionali | Usare `dash.callback_context` per identificare il trigger |
| **Performance** con ~1800 punti + ricalcoli | Scatter/Box gestiscono bene 1800 punti; cachare il preprocessing |
| **Doppio-click** non nativo in Dash | Sostituire con pulsanti espliciti "Focus"/"Reset" (UX più chiara) |
| **Layout a percentuali fisse** dell'originale | Adottare grid/flex responsive di Dash (miglioramento) |

---

## 8. Dipendenze da aggiungere

```
dash
dash-bootstrap-components   # opzionale, per il layout
pandas
numpy
scikit-learn
plotly
```

---

### Conclusione
La migrazione consigliata sostituisce il rendering D3 manuale con **Plotly nativo** orchestrato da **callback Dash**, mantenendo intatto il modello a 3 viste collegate e il concetto analitico chiave (probabilità implicita vs. frequenza reale). L'approccio riduce drasticamente il codice di rendering, sfrutta il crossfilter nativo di Dash e apre la strada ai miglioramenti della sezione 5. Effort stimato: il grosso del valore arriva con le Fasi 0–4 (parità funzionale); le Fasi 5–6 sono incrementali.
