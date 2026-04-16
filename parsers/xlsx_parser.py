"""
XLSX parser for allergen tables.

Expected column layout (flexible):
  Column 0   : dish/product name
  Column 1.. : allergen columns (headers must be recognisable allergen names)

Marker conventions accepted:
  "X", "x", "●", "•", "1", "yes", "sim", "c", "true"  → contains
  "PC", "pc", "may", "pode conter"                      → may contain
  Empty / NaN / "no" / "não" / "n"                      → not present
"""

import logging
from pathlib import Path
from typing import List, Optional

import pandas as pd

from models import Dish, AllergenPresence, AllergenType, EU_ALLERGENS
from parsers.pdf_parser import (
    _resolve_header,
    _make_allergen_presence,
    _is_section_header,
)

logger = logging.getLogger(__name__)

CONTAINS_VALUES = {"x", "●", "•", "1", "yes", "sim", "c", "true", "contém", "contem"}
MAY_CONTAIN_VALUES = {"pc", "may", "pode conter", "pode"}


def _cell_to_presence(value) -> Optional[AllergenType]:
    """Map a cell value to AllergenType or None."""
    if value is None:
        return None
    s = str(value).strip().lower()
    if not s or s in {"nan", "none", "no", "não", "nao", "n", "-"}:
        return None
    if s in MAY_CONTAIN_VALUES:
        return AllergenType.MAY_CONTAIN
    if s in CONTAINS_VALUES:
        return AllergenType.CONTAINS
    return None


def _find_header_row(df: pd.DataFrame) -> Optional[int]:
    """Return the index of the row that looks like a header."""
    for idx, row in df.iterrows():
        hits = sum(
            1 for cell in row
            if isinstance(cell, str) and _resolve_header(str(cell)) is not None
        )
        if hits >= 2:
            return idx
    return None


def parse_xlsx(file_path: Path) -> List[Dish]:
    """Parse an XLSX file and return a list of Dish objects."""
    source_file = file_path.name
    logger.info("Parsing XLSX: %s", file_path)
    dishes: List[Dish] = []

    xl = pd.ExcelFile(file_path)

    for sheet_name in xl.sheet_names:
        df = xl.parse(sheet_name, header=None, dtype=str)
        df = df.where(df.notna(), None)

        header_idx = _find_header_row(df)
        if header_idx is None:
            logger.warning("No header row found in sheet %r — skipping", sheet_name)
            continue

        # Build column map from the header row
        header_row = df.iloc[header_idx]
        col_map = {}
        for col_idx, cell in enumerate(header_row):
            if cell is None:
                continue
            key = _resolve_header(str(cell))
            if key:
                col_map[col_idx] = key

        if not col_map:
            logger.warning("No allergen columns detected in sheet %r — skipping", sheet_name)
            continue

        name_col = 0  # dish name is always in column 0
        current_category: Optional[str] = None

        for row_idx in range(header_idx + 1, len(df)):
            row = df.iloc[row_idx]
            dish_name_raw = row.iloc[name_col]
            if dish_name_raw is None:
                continue
            dish_name = str(dish_name_raw).strip()
            if not dish_name or dish_name.lower() in {"nan", "none"}:
                continue

            if _is_section_header(dish_name):
                current_category = dish_name.title()
                continue

            allergens: List[AllergenPresence] = []
            for col_idx, allergen_key in col_map.items():
                if col_idx >= len(row):
                    continue
                cell_val = row.iloc[col_idx]
                presence = _cell_to_presence(cell_val)
                if presence is None:
                    continue
                detail = str(cell_val).strip() if allergen_key in {"gluten", "nuts"} else None
                allergens.append(_make_allergen_presence(allergen_key, presence, detail))

            dishes.append(
                Dish(
                    name=dish_name,
                    category=current_category,
                    source_file=source_file,
                    allergens=allergens,
                )
            )

    logger.info("Extracted %d dishes from %s", len(dishes), source_file)
    return dishes
