"""
Interactive parser — wizard for non-standard sheets.

Invoked when the user passes --interactive / -i.  It loads the file,
shows a preview, and asks the user to:
  1. Confirm (or change) which column holds the dish name.
  2. Map each remaining column to one of the 14 EU allergens (or skip it).
  3. Specify which cell values mean "contains" vs "may contain".

Supports .pdf (table extraction), .xlsx, .xls, and .csv.
"""

from __future__ import annotations

import csv
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd

from models import Dish, AllergenPresence, AllergenType, EU_ALLERGENS
from parsers.pdf_parser import _make_allergen_presence

logger = logging.getLogger(__name__)

# ── display helpers ──────────────────────────────────────────────────────────

_COL_WIDTH = 14
_MAX_PREVIEW_ROWS = 12
_MAX_PREVIEW_COLS = 18

_ALLERGEN_KEYS = list(EU_ALLERGENS.keys())
_ALLERGEN_NAMES_EN = {k: EU_ALLERGENS[k]["name_en"] for k in _ALLERGEN_KEYS}


def _truncate(s: str, width: int) -> str:
    s = str(s) if s is not None else ""
    return s if len(s) <= width else s[: width - 1] + "…"


def _print_table(headers: List[str], rows: List[List[str]]) -> None:
    """Render a simple fixed-width table to stdout."""
    col_count = len(headers)
    widths = [
        max(_COL_WIDTH, min(len(str(h or "")), _COL_WIDTH + 6))
        for h in headers
    ]

    def _row_line(cells):
        return "  ".join(
            _truncate(str(c) if c is not None else "", widths[i]).ljust(widths[i])
            for i, c in enumerate(cells)
        )

    sep = "  ".join("-" * w for w in widths)
    # column-index header
    idx_line = "  ".join(f"[{i}]".ljust(widths[i]) for i in range(col_count))
    print("\n" + idx_line)
    print(_row_line(headers))
    print(sep)
    for row in rows:
        padded = list(row) + [""] * (col_count - len(row))
        print(_row_line(padded))
    print()


def _ask(prompt: str, default: str = "") -> str:
    """Prompt the user and return stripped input (or default on empty)."""
    suffix = f" [{default}]" if default else ""
    try:
        ans = input(f"{prompt}{suffix}: ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        raise SystemExit(0)
    return ans if ans else default


def _ask_int(prompt: str, default: int, lo: int, hi: int) -> int:
    while True:
        raw = _ask(prompt, str(default))
        try:
            val = int(raw)
            if lo <= val <= hi:
                return val
            print(f"  Please enter a number between {lo} and {hi}.")
        except ValueError:
            print("  Not a valid number, try again.")


# ── file loading ─────────────────────────────────────────────────────────────

def _load_as_dataframe(file_path: Path) -> pd.DataFrame:
    """Return a raw DataFrame (all strings) from any supported format."""
    ext = file_path.suffix.lower()

    if ext in (".xlsx", ".xls"):
        xl = pd.ExcelFile(file_path)
        if len(xl.sheet_names) == 1:
            sheet = xl.sheet_names[0]
        else:
            print(f"\nSheets found: {', '.join(xl.sheet_names)}")
            sheet = _ask("Which sheet to use", xl.sheet_names[0])
        df = xl.parse(sheet, header=None, dtype=str)

    elif ext == ".csv":
        # auto-detect encoding + delimiter
        from parsers.csv_parser import _detect_encoding, _detect_delimiter
        enc = _detect_encoding(file_path)
        delim = _detect_delimiter(file_path, enc)
        df = pd.read_csv(file_path, header=None, dtype=str,
                         encoding=enc, sep=delim)

    elif ext == ".pdf":
        import pdfplumber
        tables = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                for tbl in page.extract_tables():
                    if tbl:
                        tables.extend(tbl)
        if not tables:
            raise ValueError("No tables found in PDF.")
        df = pd.DataFrame(tables)

    else:
        raise ValueError(f"Unsupported extension: {ext}")

    return df.where(df.notna(), None)


# ── allergen menu ─────────────────────────────────────────────────────────────

def _print_allergen_menu() -> None:
    print("\n  Allergen options:")
    for i, key in enumerate(_ALLERGEN_KEYS):
        print(f"    {i+1:>2}. {key:<14}  ({_ALLERGEN_NAMES_EN[key]})")
    print("     s. skip (not an allergen column)")
    print()


def _ask_allergen_for_column(col_idx: int, header: str) -> Optional[str]:
    """Ask the user to map a column to an allergen key, or skip."""
    _print_allergen_menu()
    while True:
        ans = _ask(
            f"  Column [{col_idx}] '{header}' → allergen number or 's' to skip",
            "s",
        ).lower()
        if ans in ("s", "skip", ""):
            return None
        try:
            n = int(ans)
            if 1 <= n <= len(_ALLERGEN_KEYS):
                return _ALLERGEN_KEYS[n - 1]
            print(f"  Enter a number 1–{len(_ALLERGEN_KEYS)} or 's'.")
        except ValueError:
            # Maybe they typed the key directly
            if ans in _ALLERGEN_KEYS:
                return ans
            print(f"  Not recognised. Enter a number or 's'.")


# ── marker configuration ──────────────────────────────────────────────────────

def _collect_unique_markers(df: pd.DataFrame, allergen_cols: List[int]) -> List[str]:
    """Return sorted unique non-null cell values across allergen columns."""
    vals = set()
    for col in allergen_cols:
        for v in df.iloc[:, col].dropna():
            s = str(v).strip()
            if s and s.lower() not in {"nan", "none"}:
                vals.add(s)
    return sorted(vals)


def _ask_markers(
    unique_vals: List[str],
) -> Tuple[set, set]:
    """Return (contains_values, may_contain_values) as sets of lowercase strings."""
    print("\n  Unique values found in allergen columns:")
    for v in unique_vals:
        print(f"    '{v}'")

    print()
    c_raw = _ask(
        "  Values that mean CONTAINS (comma-separated)",
        "X,x,●,1,C,c,yes,sim",
    )
    mc_raw = _ask(
        "  Values that mean MAY CONTAIN (comma-separated)",
        "PC,pc,may,pode,*",
    )

    contains_vals = {v.strip().lower() for v in c_raw.split(",") if v.strip()}
    may_vals = {v.strip().lower() for v in mc_raw.split(",") if v.strip()}
    return contains_vals, may_vals


# ── main wizard ───────────────────────────────────────────────────────────────

def parse_interactive(file_path: Path) -> List[Dish]:
    """Full interactive wizard. Returns parsed Dish list."""
    print(f"\n{'═'*60}")
    print(f"  INTERACTIVE PARSER  —  {file_path.name}")
    print(f"{'═'*60}")

    df = _load_as_dataframe(file_path)

    total_rows, total_cols = df.shape
    print(f"\n  File loaded: {total_rows} rows × {total_cols} columns.")

    # ── 1. Preview ────────────────────────────────────────────────────────
    preview_cols = min(total_cols, _MAX_PREVIEW_COLS)
    preview_rows = min(total_rows, _MAX_PREVIEW_ROWS)

    print(f"\n  Preview (first {preview_rows} rows, first {preview_cols} columns):")
    raw_headers = [str(df.iloc[0, c]) if df.iloc[0, c] is not None else f"col{c}"
                   for c in range(preview_cols)]
    raw_rows = [
        [df.iloc[r, c] for c in range(preview_cols)]
        for r in range(1, preview_rows)
    ]
    _print_table(raw_headers, raw_rows)

    # ── 2. Header row ─────────────────────────────────────────────────────
    header_row_idx = _ask_int(
        "  Which row contains the column headers? (0-based index)",
        default=0,
        lo=0,
        hi=total_rows - 1,
    )
    headers = [
        str(df.iloc[header_row_idx, c]) if df.iloc[header_row_idx, c] is not None else f"col{c}"
        for c in range(total_cols)
    ]

    # ── 3. Dish-name column ────────────────────────────────────────────────
    print(f"\n  Column headers found:")
    for i, h in enumerate(headers):
        print(f"    [{i}]  {_truncate(h, 40)}")

    name_col = _ask_int(
        "\n  Which column index is the DISH / PRODUCT NAME?",
        default=0,
        lo=0,
        hi=total_cols - 1,
    )

    # ── 4. Map remaining columns to allergens ─────────────────────────────
    print(f"\n  Now map each remaining column to an allergen (or skip).")
    col_map: Dict[int, str] = {}  # col_idx → allergen_key

    for i, h in enumerate(headers):
        if i == name_col:
            continue
        allergen_key = _ask_allergen_for_column(i, h)
        if allergen_key:
            col_map[i] = allergen_key
            print(f"    ✓  [{i}] '{h}'  →  {allergen_key}")

    if not col_map:
        print("\n  No allergen columns mapped — nothing to extract.")
        return []

    # ── 5. Marker values ──────────────────────────────────────────────────
    unique_vals = _collect_unique_markers(df, list(col_map.keys()))
    contains_vals, may_vals = _ask_markers(unique_vals)

    # ── 6. Category column (optional) ─────────────────────────────────────
    use_category = _ask("  Is there a CATEGORY / SECTION column? (y/n)", "n").lower()
    category_col: Optional[int] = None
    if use_category.startswith("y"):
        category_col = _ask_int(
            "  Which column index is the category?",
            default=0,
            lo=0,
            hi=total_cols - 1,
        )

    # ── 7. Skip rows at top ────────────────────────────────────────────────
    data_start = header_row_idx + 1
    print(f"\n  Data will be read from row {data_start} onward.")
    confirm_start = _ask(
        f"  Override start row? (press Enter to keep {data_start}, or enter row index)",
        str(data_start),
    )
    try:
        data_start = int(confirm_start)
    except ValueError:
        pass

    # ── 8. Process ────────────────────────────────────────────────────────
    print(f"\n  Processing...")

    def _cell_presence(val) -> Optional[AllergenType]:
        if val is None:
            return None
        s = str(val).strip().lower()
        if not s or s in {"nan", "none", "-", ""}:
            return None
        if s in may_vals:
            return AllergenType.MAY_CONTAIN
        if s in contains_vals:
            return AllergenType.CONTAINS
        return None

    dishes: List[Dish] = []
    source_file = file_path.name
    current_category: Optional[str] = None

    for row_idx in range(data_start, total_rows):
        row = df.iloc[row_idx]

        raw_name = row.iloc[name_col]
        if raw_name is None:
            continue
        dish_name = str(raw_name).strip()
        if not dish_name or dish_name.lower() in {"nan", "none"}:
            continue

        if category_col is not None:
            cat_val = row.iloc[category_col]
            if cat_val is not None:
                s = str(cat_val).strip()
                if s and s.lower() not in {"nan", "none"}:
                    current_category = s.title()

        allergens: List[AllergenPresence] = []
        for col_idx, allergen_key in col_map.items():
            if col_idx >= len(row):
                continue
            presence = _cell_presence(row.iloc[col_idx])
            if presence is None:
                continue
            allergens.append(_make_allergen_presence(allergen_key, presence))

        dishes.append(
            Dish(
                name=dish_name,
                category=current_category,
                source_file=source_file,
                allergens=allergens,
            )
        )

    print(f"  Done — {len(dishes)} dishes extracted.")

    # ── 9. Quick review ───────────────────────────────────────────────────
    if dishes:
        print(f"\n  Sample (first 5 dishes):")
        for d in dishes[:5]:
            c = ", ".join(a.allergen_name_en for a in d.contains_allergens) or "—"
            mc = ", ".join(a.allergen_name_en for a in d.may_contain_allergens) or "—"
            print(f"    {_truncate(d.name, 35)}")
            print(f"      Contains:     {c}")
            print(f"      May contain:  {mc}")
        print()

    return dishes
