"""Data loading and preprocessing for the Odds Visual Analytics page.

The shipped CSV (``odds23.csv``) already contains the pre-computed ``x``/``y``
MDS projection and ``isOver`` columns, so by default we just load it as-is for
1:1 fidelity with the original D3 tool. Set ``recompute=True`` to recompute the
projection with scikit-learn instead.
"""

from __future__ import annotations

import os

import pandas as pd

ODD_LABELS = ["AvgH", "AvgD", "AvgA", "AvgO", "AvgU"]

DIM_TO_OUTCOME = {
    "AvgH": "H",
    "AvgD": "D",
    "AvgA": "A",
    "AvgO": "Over",
    "AvgU": "Under",
}

_DATA_PATH = os.path.join(os.path.dirname(__file__), "odds23.csv")


def _compute_is_over(df: pd.DataFrame) -> pd.Series:
    return (df["HG"] + df["AG"] > 2.5).map({True: "Over", False: "Under"})


def _reduce_mds(df: pd.DataFrame) -> pd.DataFrame:
    from sklearn.manifold import MDS
    from sklearn.preprocessing import StandardScaler

    x = StandardScaler().fit_transform(df[ODD_LABELS])
    coords = MDS(n_components=2, random_state=42, normalized_stress="auto").fit_transform(x)
    df = df.copy()
    df["x"] = coords[:, 0]
    df["y"] = coords[:, 1]
    return df


def load_data(path: str | None = None, recompute: bool = False) -> pd.DataFrame:
    """Load the odds dataset, ensuring ``x``, ``y`` and ``isOver`` columns.

    Args:
        path: CSV path (defaults to the bundled ``odds23.csv``).
        recompute: if True, recompute the MDS projection and ``isOver`` via sklearn.
    """
    df = pd.read_csv(path or _DATA_PATH)

    if recompute or "isOver" not in df.columns:
        df["isOver"] = _compute_is_over(df)
    if recompute or "x" not in df.columns or "y" not in df.columns:
        df = _reduce_mds(df)

    df = df.reset_index(drop=True)
    df["row_id"] = df.index
    return df
