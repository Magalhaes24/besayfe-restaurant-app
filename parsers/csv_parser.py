"""
CSV parser for allergen tables.

Accepts two CSV layouts:

LAYOUT A — Wide format (same structure as XLSX):
  dish_name, gluten, crustaceans, eggs, fish, ...
  "Hamburger", "X", "", "X", "", ...

LAYOUT B — Long/tall format:
  dish_name, allergen, type
  "Hamburger", "gluten", "contains"
  "Hamburger", "eggs", "may_contain"

The parser auto-detects which layout is present by checking whether the
second column header matches a known allergen name.
"""

import csv
import logging
from pathlib import Path
from typing import List, Optional

from models import Dish, AllergenPresence, AllergenType
from parsers.pdf_parser import _resolve_header, _make_allergen_presence, _is_section_header
from parsers.xlsx_parser import _cell_to_presence

logger = logging.getLogger(__name__)


def _detect_encoding(file_path: Path) -> str:
    """Try UTF-8-sig first (handles BOM), fall back to latin-1."""
    for enc in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            with open(file_path, encoding=enc) as f:
                f.read(1024)
            return enc
        except UnicodeDecodeError:
            continue
    return "latin-1"


def _detect_delimiter(file_path: Path, encoding: str) -> str:
    with open(file_path, encoding=encoding, newline="") as f:
        sample = f.read(4096)
    sniffer = csv.Sniffer()
    try:
        dialect = sniffer.sniff(sample, delimiters=",;\t|")
        return dialect.delimiter
    except csv.Error:
        return ","


def parse_csv(file_path: Path) -> List[Dish]:
    """Parse a CSV file and return a list of Dish objects."""
    source_file = file_path.name
    logger.info("Parsing CSV: %s", file_path)

    encoding = _detect_encoding(file_path)
    delimiter = _detect_delimiter(file_path, encoding)

    with open(file_path, encoding=encoding, newline="") as f:
        reader = csv.reader(f, delimiter=delimiter)
        rows = list(reader)

    if not rows:
        logger.warning("Empty CSV file: %s", file_path)
        return []

    header = rows[0]
    data_rows = rows[1:]

    # -----------------------------------------------------------------
    # Detect layout
    # -----------------------------------------------------------------
    # Wide layout: second column (index 1) is a recognisable allergen
    # Long layout: columns are typically "dish", "allergen", "type"
    is_wide = len(header) > 2 and any(
        _resolve_header(h) is not None for h in header[1:]
    )

    if is_wide:
        return _parse_wide(header, data_rows, source_file)
    else:
        return _parse_long(header, data_rows, source_file)


def _parse_wide(header: List[str], rows: List[List[str]],
                source_file: str) -> List[Dish]:
    """Parse a wide-format CSV (allergens as columns)."""
    col_map = {}
    for i, h in enumerate(header):
        key = _resolve_header(h)
        if key:
            col_map[i] = key

    dishes: List[Dish] = []
    current_category: Optional[str] = None

    for row in rows:
        if not row or not row[0].strip():
            continue

        dish_name = row[0].strip()
        if _is_section_header(dish_name):
            current_category = dish_name.title()
            continue

        allergens: List[AllergenPresence] = []
        for col_idx, allergen_key in col_map.items():
            if col_idx >= len(row):
                continue
            presence = _cell_to_presence(row[col_idx])
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

    logger.info("Extracted %d dishes from %s (wide format)", len(dishes), source_file)
    return dishes


def _parse_long(header: List[str], rows: List[List[str]],
                source_file: str) -> List[Dish]:
    """
    Parse a long-format CSV:
      dish_name | allergen_key_or_name | type ('contains'|'may_contain')
    Optional 4th column: ingredient list (semicolon-separated).
    """
    # Detect column positions by header
    h_lower = [h.lower().strip() for h in header]

    def _find_col(*candidates):
        for c in candidates:
            for i, h in enumerate(h_lower):
                if c in h:
                    return i
        return None

    name_col = _find_col("dish", "nome", "produto", "name") or 0
    allergen_col = _find_col("allergen", "alerg") or 1
    type_col = _find_col("type", "tipo", "presence") or 2
    ingredient_col = _find_col("ingredient", "ingrediente")

    dish_map: dict = {}

    for row in rows:
        if not row or not row[0].strip():
            continue
        dish_name = row[name_col].strip() if name_col < len(row) else ""
        if not dish_name:
            continue

        allergen_raw = row[allergen_col].strip() if allergen_col < len(row) else ""
        type_raw = row[type_col].strip().lower() if type_col < len(row) else ""

        allergen_key = _resolve_header(allergen_raw)
        if allergen_key is None:
            continue

        if "may" in type_raw or "pc" in type_raw or "pode" in type_raw:
            presence_type = AllergenType.MAY_CONTAIN
        else:
            presence_type = AllergenType.CONTAINS

        if dish_name not in dish_map:
            dish_map[dish_name] = Dish(
                name=dish_name,
                source_file=source_file,
                allergens=[],
                ingredients=[],
            )

        dish_map[dish_name].allergens.append(
            _make_allergen_presence(allergen_key, presence_type)
        )

        if ingredient_col is not None and ingredient_col < len(row):
            for ing in row[ingredient_col].split(";"):
                ing = ing.strip()
                if ing and ing not in dish_map[dish_name].ingredients:
                    dish_map[dish_name].ingredients.append(ing)

    dishes = list(dish_map.values())
    logger.info("Extracted %d dishes from %s (long format)", len(dishes), source_file)
    return dishes
