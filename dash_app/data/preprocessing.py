"""Data loading and preprocessing for the Odds Visual Analytics tool.

Port of the original ``preprocessing.js`` (druid.js MDS + isOver) to Python.

The shipped CSV (``odds23.csv``) already contains the pre-computed ``x``/``y``
MDS projection and ``isOver`` columns, so by default we just load it as-is for
1:1 fidelity with the original D3 tool. Set ``recompute=True`` to recompute the
projection with scikit-learn instead (useful if you change the input columns).
"""

from __future__ import annotations

import os

import pandas as pd

# The 5 odds dimensions analysed by the tool (Home / Draw / Away / Over / Under).
ODD_LABELS = ["AvgH", "AvgD", "AvgA", "AvgO", "AvgU"]

# Mapping odds-dimension -> the outcome whose observed frequency it is compared
# against in the comparative chart.
DIM_TO_OUTCOME = {
    "AvgH": "H",
    "AvgD": "D",
    "AvgA": "A",
    "AvgO": "Over",
    "AvgU": "Under",
}

_DATA_PATH = os.path.join(os.path.dirname(__file__), "odds23.csv")


def _compute_is_over(df: pd.DataFrame) -> pd.Series:
    """Over/Under 2.5 goals label, as in the original tool."""
    return (df["HG"] + df["AG"] > 2.5).map({True: "Over", False: "Under"})


def _reduce_mds(df: pd.DataFrame) -> pd.DataFrame:
    """Z-score normalise the 5 odds and project to 2D with MDS (sklearn)."""
    from sklearn.manifold import MDS
    from sklearn.preprocessing import StandardScaler

    x = StandardScaler().fit_transform(df[ODD_LABELS])
    coords = MDS(n_components=2, random_state=42, normalized_stress="auto").fit_transform(x)
    df = df.copy()
    df["x"] = coords[:, 0]
    df["y"] = coords[:, 1]
    return df


def load_data(path: str | None = None, recompute: bool = False) -> pd.DataFrame:
    """Load the odds dataset, ensuring the ``x``, ``y`` and ``isOver`` columns.

    Args:
        path: CSV path (defaults to the bundled ``odds23.csv``).
        recompute: if True, recompute the MDS projection and ``isOver`` with
            scikit-learn instead of trusting the columns already in the CSV.
    """
    df = pd.read_csv(path or _DATA_PATH)

    if recompute or "isOver" not in df.columns:
        df["isOver"] = _compute_is_over(df)
    if recompute or "x" not in df.columns or "y" not in df.columns:
        df = _reduce_mds(df)

    # Stable identifier carried through the figures so selections survive
    # filtering/re-rendering. Mirrors the index-based selection of the original.
    df = df.reset_index(drop=True)
    df["row_id"] = df.index
    return df
