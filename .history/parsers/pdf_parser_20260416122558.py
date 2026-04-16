"""
PDF parser for allergen tables.

Three real-world formats supported:

FORMAT A — McDonald's  (5-vp-alergenios-balcao-07-abr_2026.pdf)
  pdfplumber extracts a 15-column table (except page 1 which collapses).
  Allergen headers are in row 1 of each page, merged into one cell on page 1.
  Marker: "●" (filled circle, U+25CF) = contains. No may-contain marker.
  GLUTEN column may contain grain detail: "● Trigo", "● Aveia, Trigo".
  NUTS column may contain specific nut names.
  "Não tem alergénios." in second cell = dish has no allergens.

FORMAT B — H3  (tabela_alergenios_h3.pdf)
  Table columns are not cleanly separated; pdfplumber returns 36-56 columns
  with many Nones. The allergen headers appear as text at the BOTTOM of each
  page. We use word x-positions to build an x-range → allergen-key map, then
  assign each "C"/"PC" marker to its allergen by x-position.
  Marker: "C" = contains, "PC" = may contain.
  Dishes have sub-component rows (ingredients); we merge their allergens up.

FORMAT C — Vira  (vira_alergenios.pdf)
  Clean 13-column table with headers in row 0.
  Marker: "X" = contains, "PC" = may contain.
  Each row is an independent product/ingredient (no sub-row merging needed).
  Section headers are ALL-CAPS rows with empty allergen cells.
"""

import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pdfplumber

from models import Dish, AllergenPresence, AllergenType, EU_ALLERGENS

logger = logging.getLogger(__name__)


# =========================================================================
# Allergen key lookup tables
# =========================================================================

# Map lower-cased header text → canonical allergen key
HEADER_TO_KEY: Dict[str, str] = {}
for _key, _meta in EU_ALLERGENS.items():
    HEADER_TO_KEY[_meta["name_pt"].lower()] = _key
    HEADER_TO_KEY[_meta["name_en"].lower()] = _key
    for _alias in _meta["aliases_pt"]:
        HEADER_TO_KEY[_alias.lower()] = _key

_EXTRA: Dict[str, str] = {
    "glúten": "gluten",
    "crustáceos": "crustaceans",
    "crustá-ceos": "crustaceans",
    "crustáceos": "crustaceans",
    "ovos": "eggs",
    "ovo": "eggs",
    "peixe": "fish",
    "peixes": "fish",
    "amendoim": "peanuts",
    "amendoins": "peanuts",
    "amen-doins": "peanuts",
    "soja": "soybeans",
    "leite": "milk",
    "frutos de casca rija": "nuts",
    "frutos de c. rija": "nuts",
    "frutos casca rija": "nuts",
    "frutos\ncasca rija": "nuts",
    "aipo": "celery",
    "mostarda": "mustard",
    "sésamo": "sesame",
    "sesamo": "sesame",
    "s. de sésamo": "sesame",
    "dióxido de enxofre e sulfitos >10mg/kg": "sulphites",
    "dióxido de enxofre e sulfitos": "sulphites",
    "sulfitos": "sulphites",
    "tremoço": "lupin",
    "tremoco": "lupin",
    "moluscos": "molluscs",
}
HEADER_TO_KEY.update(_EXTRA)

# Allergen keywords used to locate header words (substrings)
_ALLERGEN_SUBSTRINGS = [
    "glút", "glut", "crustá", "crusta", "ovos", "peixe", "soja",
    "leite", "aipo", "mostarda", "sésamo", "sesamo", "sulfito", "tremoço",
    "tremoco", "molus", "amendoim", "amendoins", "amen-d", "frutos",
]

# The canonical fixed allergen column order for McDonald's format
# (columns 1..14 in the extracted table, index 0 = dish name)
MCDONALDS_ALLERGEN_ORDER = [
    "gluten",       # col 1  — may contain grain detail text
    "crustaceans",  # col 2
    "eggs",         # col 3
    "fish",         # col 4
    "peanuts",      # col 5
    "soybeans",     # col 6
    "milk",         # col 7
    "nuts",         # col 8  — may contain nut name text
    "celery",       # col 9
    "mustard",      # col 10
    "sesame",       # col 11
    "sulphites",    # col 12
    "lupin",        # col 13
    "molluscs",     # col 14
]

# The canonical column order for Vira format (matches headers in table row 0)
VIRA_ALLERGEN_ORDER = [
    "gluten",       # col 1  GLÚTEN
    "eggs",         # col 2  OVOS
    "peanuts",      # col 3  AMENDOINS
    "soybeans",     # col 4  SOJA
    "fish",         # col 5  PEIXE
    "crustaceans",  # col 6  CRUSTÁCEOS
    "celery",       # col 7  AIPO
    "milk",         # col 8  LEITE
    "nuts",         # col 9  FRUTOS CASCA RIJA
    "molluscs",     # col 10 MOLUSCOS
    "mustard",      # col 11 MOSTARDA
    "sulphites",    # col 12 SULFITOS
]


# =========================================================================
# Utility helpers
# =========================================================================

def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip().lower()


def _cell(val) -> str:
    return (val or "").strip()


def _resolve_header(raw: str) -> Optional[str]:
    n = _norm(raw)
    if n in HEADER_TO_KEY:
        return HEADER_TO_KEY[n]
    for alias, key in HEADER_TO_KEY.items():
        if alias and alias in n:
            return key
    return None


def _is_section_header(text: str) -> bool:
    t = text.strip()
    if not t or len(t) < 3:
        return False
    return t == t.upper() and not any(c.isdigit() for c in t[:2])


def _make_presence(key: str, ptype: AllergenType,
                   detail: Optional[str] = None) -> AllergenPresence:
    m = EU_ALLERGENS[key]
    return AllergenPresence(
        allergen_key=key,
        allergen_name_pt=m["name_pt"],
        allergen_name_en=m["name_en"],
        presence_type=ptype,
        detail=detail or None,
    )


def _merge(existing: List[AllergenPresence],
           incoming: List[AllergenPresence]) -> List[AllergenPresence]:
    """
    Merge incoming allergens into existing list.
    'contains' supersedes 'may_contain' for the same allergen key.
    """
    idx: Dict[Tuple[str, AllergenType], AllergenPresence] = {
        (a.allergen_key, a.presence_type): a for a in existing
    }
    for inc in incoming:
        kc = (inc.allergen_key, AllergenType.CONTAINS)
        kpc = (inc.allergen_key, AllergenType.MAY_CONTAIN)
        if inc.presence_type == AllergenType.CONTAINS:
            idx.pop(kpc, None)
            idx[kc] = inc
        else:
            if kc not in idx:
                idx[kpc] = inc
    return list(idx.values())


# =========================================================================
# Format detection
# =========================================================================

def _detect_format(full_text: str) -> str:
    tl = full_text.lower()
    if "não tem alergénios" in tl:
        return "mcdonalds"
    if "virada" in tl or "vitoque" in tl or "pag. 1/2" in tl:
        return "vira"
    return "h3"


# =========================================================================
# FORMAT A — McDonald's parser
# =========================================================================

def _parse_mcdonalds(pdf: pdfplumber.PDF, source_file: str) -> List[Dish]:
    dishes: List[Dish] = []
    current_category: Optional[str] = None

    for page in pdf.pages:
        tables = page.extract_tables()
        if not tables:
            continue
        table = tables[0]

        # Determine number of allergen columns in this table
        if not table or not table[0]:
            continue
        n_cols = len(table[0])

        # Skip page-1-style collapsed tables (only 2 real columns)
        # Detect: all rows beyond col 1 are None
        if n_cols <= 2 or all(
            all(table[r][c] is None for c in range(2, n_cols))
            for r in range(len(table))
        ):
            # Page 1 collapsed — parse the allergen text from cell[1] directly
            for row in table:
                dish_name = _cell(row[0])
                if not dish_name:
                    continue
                if _is_section_header(dish_name):
                    current_category = dish_name.title()
                    continue
                # The second cell is either "Não tem alergénios." or a text block
                # with allergen names. We can't reliably extract which allergens
                # are present without per-column positions, so we create the dish
                # with no allergens for page 1 items.
                cell1 = _cell(row[1]) if len(row) > 1 else ""
                allergens = []
                if "não tem alergénios" not in cell1.lower():
                    # Try to detect allergens from the text
                    allergens = _allergens_from_text_cell(cell1)
                dishes.append(Dish(
                    name=dish_name,
                    category=current_category,
                    source_file=source_file,
                    allergens=allergens,
                ))
            continue

        # Multi-column table: find which rows are headers
        # Header rows contain allergen keyword text
        header_rows = []
        data_rows = []
        for row in table:
            joined = " ".join(_cell(c) for c in row).lower()
            hits = sum(1 for s in _ALLERGEN_SUBSTRINGS if s in joined)
            if hits >= 3:
                header_rows.append(row)
            else:
                data_rows.append(row)

        # Build col_map from header rows using known allergen order
        # When headers are clearly present, use them; otherwise use fixed order.
        col_map: Dict[int, str] = {}
        if header_rows:
            # Try to match header text to allergen keys
            merged_header = [""] * n_cols
            for hrow in header_rows:
                for i, cell in enumerate(hrow):
                    if cell:
                        merged_header[i] += " " + _cell(cell)
            for i, text in enumerate(merged_header):
                key = _resolve_header(text)
                if key:
                    col_map[i] = key

        # If header detection found few columns, fall back to fixed order
        # Col 0 = dish name, cols 1..14 = allergens in canonical order
        if len(col_map) < 5:
            col_map = {}
            allergen_cols_start = 1
            for offset, key in enumerate(MCDONALDS_ALLERGEN_ORDER):
                col_idx = allergen_cols_start + offset
                if col_idx < n_cols:
                    col_map[col_idx] = key

        # But we need to account for pages that have an extra empty col 1
        # (seen on some pages where col 0 = empty, col 1 = dish name, col 2+ = allergens)
        # Check: is col 0 always empty in data rows?
        if all(not _cell(row[0]) for row in data_rows if row):
            # Shift: dish name is col 1, allergens start at col 2
            col_map = {}
            for offset, key in enumerate(MCDONALDS_ALLERGEN_ORDER):
                col_idx = 2 + offset
                if col_idx < n_cols:
                    col_map[col_idx] = key
            dish_col = 1
        else:
            dish_col = 0

        for row in data_rows:
            if not row:
                continue
            dish_name = _cell(row[dish_col]) if dish_col < len(row) else ""
            if not dish_name:
                continue

            if _is_section_header(dish_name):
                current_category = dish_name.title()
                continue

            # Check for "Não tem alergénios" in ANY cell of the row
            row_text = " ".join(_cell(c) for c in row).lower()
            if "não tem alergénios" in row_text:
                dishes.append(Dish(
                    name=dish_name,
                    category=current_category,
                    source_file=source_file,
                    allergens=[],
                ))
                continue

            allergens: List[AllergenPresence] = []
            for col_idx, allergen_key in col_map.items():
                if col_idx >= len(row):
                    continue
                cell_val = _cell(row[col_idx])
                if not cell_val:
                    continue

                # McDonald's marker: "●" (U+25CF) or "•" (U+2022)
                # Cell may also be "● Trigo" etc.
                has_bullet = "●" in cell_val or "•" in cell_val
                if not has_bullet:
                    continue

                detail = None
                if allergen_key == "gluten":
                    detail = re.sub(r"[●•]", "", cell_val).strip() or None
                elif allergen_key == "nuts":
                    detail = re.sub(r"[●•]", "", cell_val).strip() or None

                allergens.append(_make_presence(allergen_key, AllergenType.CONTAINS, detail))

            dishes.append(Dish(
                name=dish_name,
                category=current_category,
                source_file=source_file,
                allergens=allergens,
            ))

    return dishes


def _allergens_from_text_cell(text: str) -> List[AllergenPresence]:
    """
    When an allergen cell contains free text (page-1 McDonald's collapse),
    try to infer allergens from text content.
    E.g. "● Leite" → milk contains.
    """
    result = []
    lines = text.split("\n")
    for line in lines:
        line = line.strip()
        if not line:
            continue
        has_bullet = "●" in line or "•" in line
        if not has_bullet:
            continue
        clean = re.sub(r"[●•]", "", line).strip()
        key = _resolve_header(clean)
        if key:
            result.append(_make_presence(key, AllergenType.CONTAINS))
    return result


# =========================================================================
# FORMAT B — H3 parser  (word x-position based)
# =========================================================================

# Sub-component indicator words (rows whose first cell is one of these
# are ingredient rows belonging to the current dish, not new dishes).
_H3_SUBCOMPONENTS = {
    "hambúrguer", "hamburguer", "pão h3", "pão focaccia",
    "ketchup", "alface, tomate e cebola roxa", "alface e tomate",
    "alface, tomate", "rúcula", "tomate seco", "cebolinho",
    "parmesão", "espinafres salteados", "cebola confitada",
    "escalope de foie gras", "redução de vinho do porto",
    "ovo estrelado", "ovo escalfado", "bacon aos cubos",
    "molho holandês", "molho carbonara", "molho de queijo",
    "molho tuga", "molho h3", "molho de azeite e limão",
    "cebola salteada", "vinagreta h3", "crocante de cebola",
    "alface e tomate", "mix de pickles e azeitonas",
    "arroz thai", "batatas", "salada", "pão de mafra",
    "esparregado", "mostarda amarela", "molho de iogurte",
    "bacon", "vinagrete", "croquetes de carne",
    "gelado de nata", "topping de morango", "topping de maracujá",
    "topping de caramelo", "bolacha maria", "suspiro",
    "bolo de chocolate",
}


def _build_h3_x_col_map(page: pdfplumber.page.Page) -> Dict[str, str]:
    """
    Build a map: allergen_key → x_center
    by finding allergen header words in the page and recording their x-positions.
    The headers appear at the bottom of H3 pages.
    """
    words = page.extract_words()
    if not words:
        return {}

    # Collect allergen words by x-position (bottom of page = higher y)
    # Group multi-word headers by proximity
    page_height = page.height
    header_zone_y = page_height * 0.85  # bottom 15% of page

    header_words = [
        w for w in words
        if w["top"] >= header_zone_y
        and any(s in w["text"].lower() for s in _ALLERGEN_SUBSTRINGS)
    ]

    # Build x-center → key mapping
    x_to_key: Dict[float, str] = {}
    for w in header_words:
        x_center = (w["x0"] + w["x1"]) / 2
        key = _resolve_header(w["text"])
        if key:
            x_to_key[x_center] = key

    return x_to_key


def _assign_allergen_by_x(
    x_val: float,
    x_to_key: Dict[float, str],
    tolerance: float = 15.0,
) -> Optional[str]:
    """Find the allergen key whose header x-center is closest to x_val."""
    if not x_to_key:
        return None
    best_key = None
    best_dist = float("inf")
    for x_center, key in x_to_key.items():
        dist = abs(x_val - x_center)
        if dist < best_dist:
            best_dist = dist
            best_key = key
    return best_key if best_dist <= tolerance else None


def _parse_h3(pdf: pdfplumber.PDF, source_file: str) -> List[Dish]:
    dishes: List[Dish] = []
    current_category: Optional[str] = None

    for page in pdf.pages:
        x_to_key = _build_h3_x_col_map(page)
        if not x_to_key:
            continue

        words = page.extract_words()
        if not words:
            continue

        page_height = page.height
        header_zone_y = page_height * 0.85
        content_words = [w for w in words if w["top"] < header_zone_y]

        # Group words into rows by y-position (tolerance ±4px)
        rows_by_y: Dict[float, List[dict]] = {}
        for w in content_words:
            y = round(w["top"] / 4) * 4  # bucket to 4px
            rows_by_y.setdefault(y, []).append(w)

        # Sort rows by y
        sorted_ys = sorted(rows_by_y.keys())

        # Find the x boundary of the dish-name column
        # All dish/ingredient names appear at x0 < ~140
        NAME_X_MAX = 140.0

        current_dish: Optional[Dish] = None

        for y in sorted_ys:
            row_words = sorted(rows_by_y[y], key=lambda w: w["x0"])

            # Name words: x0 < NAME_X_MAX
            name_words = [w for w in row_words if w["x0"] < NAME_X_MAX]
            # Marker words: x0 >= NAME_X_MAX and text is C or PC
            marker_words = [
                w for w in row_words
                if w["x0"] >= NAME_X_MAX
                and w["text"].upper() in {"C", "PC"}
            ]

            if not name_words and not marker_words:
                continue

            name = " ".join(w["text"] for w in name_words).strip()

            # Section header?
            if name and _is_section_header(name):
                if current_dish is not None:
                    dishes.append(current_dish)
                    current_dish = None
                current_category = name.title()
                continue

            # "s/ alergénios" = no allergens, skip
            if "s/ alergénios" in name.lower():
                continue

            # Extract allergens from marker words
            allergens: List[AllergenPresence] = []
            for mw in marker_words:
                x_center = (mw["x0"] + mw["x1"]) / 2
                key = _assign_allergen_by_x(x_center, x_to_key)
                if key is None:
                    continue
                ptype = (AllergenType.CONTAINS if mw["text"].upper() == "C"
                         else AllergenType.MAY_CONTAIN)
                allergens.append(_make_presence(key, ptype))

            if not name:
                # Pure marker row with no name — merge into current dish
                if current_dish is not None:
                    current_dish.allergens = _merge(current_dish.allergens, allergens)
                continue

            # Is this a sub-component row?
            name_lower = name.lower().strip()
            is_sub = (
                name_lower in _H3_SUBCOMPONENTS
                or name_lower.startswith((
                    "molho", "pão ", "ovo ", "bacon", "alface",
                    "tomate", "cebol", "espinafr", "parmes",
                    "rúcul", "tomate seco", "hambúrguer", "hamburguer",
                    "ketchup", "mostarda amarela", "crocante", "vinagreta",
                    "vinagrete", "arroz", "gelado", "topping", "bolacha",
                    "suspiro", "croquetes de",
                ))
                or (name and name[0].islower() and name_lower not in {
                    "s/ alergénios"
                })
            )

            if is_sub:
                if current_dish is not None:
                    if name and name_lower not in {"s/ alergénios"}:
                        current_dish.ingredients.append(name)
                    current_dish.allergens = _merge(current_dish.allergens, allergens)
                else:
                    # Orphan sub row, treat as standalone
                    if name:
                        current_dish = Dish(
                            name=name,
                            category=current_category,
                            source_file=source_file,
                            allergens=allergens,
                        )
            else:
                # New dish
                if current_dish is not None:
                    dishes.append(current_dish)
                current_dish = Dish(
                    name=name,
                    category=current_category,
                    source_file=source_file,
                    allergens=allergens,
                    ingredients=[],
                )

        if current_dish is not None:
            dishes.append(current_dish)
            current_dish = None

    return dishes


# =========================================================================
# FORMAT C — Vira parser
# =========================================================================

def _parse_vira(pdf: pdfplumber.PDF, source_file: str) -> List[Dish]:
    """
    Vira tables are clean 13-column tables.
    Row 0 = header; each subsequent row is a product or section header.
    Markers: "X" = contains, "PC" = may contain.
    """
    dishes: List[Dish] = []
    current_category: Optional[str] = None

    for page in pdf.pages:
        tables = page.extract_tables()
        if not tables:
            continue
        table = tables[0]
        if not table:
            continue

        # Find header row (contains allergen keywords)
        header_idx = 0
        col_map: Dict[int, str] = {}
        for ri, row in enumerate(table):
            joined = " ".join(_cell(c) for c in row).lower()
            hits = sum(1 for s in _ALLERGEN_SUBSTRINGS if s in joined)
            if hits >= 3:
                header_idx = ri
                for ci, cell in enumerate(row):
                    key = _resolve_header(_cell(cell))
                    if key:
                        col_map[ci] = key
                break

        if not col_map:
            # Fall back to fixed order based on known Vira column layout
            col_map = {i + 1: k for i, k in enumerate(VIRA_ALLERGEN_ORDER)}
            header_idx = 0

        for row in table[header_idx + 1:]:
            if not row:
                continue
            dish_name = _cell(row[0])
            if not dish_name:
                continue

            # Section header: ALL-CAPS, all allergen cells empty
            if _is_section_header(dish_name):
                allergen_vals = [_cell(row[c]) for c in col_map if c < len(row)]
                if not any(allergen_vals):
                    current_category = dish_name.title()
                    continue

            allergens: List[AllergenPresence] = []
            for col_idx, allergen_key in col_map.items():
                if col_idx >= len(row):
                    continue
                v = _cell(row[col_idx]).upper()
                if v == "X":
                    allergens.append(_make_presence(allergen_key, AllergenType.CONTAINS))
                elif v == "PC":
                    allergens.append(_make_presence(allergen_key, AllergenType.MAY_CONTAIN))

            dishes.append(Dish(
                name=dish_name,
                category=current_category,
                source_file=source_file,
                allergens=allergens,
            ))

    return dishes


# =========================================================================
# Public entry point
# =========================================================================

def parse_pdf(file_path: Path) -> List[Dish]:
    """
    Extract allergen data from a PDF file and return a list of Dish objects.
    Auto-detects format: McDonald's, H3, or Vira.
    """
    source_file = file_path.name
    logger.info("Parsing PDF: %s", file_path)

    full_text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            full_text += (page.extract_text() or "") + "\n"

    fmt = _detect_format(full_text)
    logger.info("Detected format: %s", fmt)

    with pdfplumber.open(file_path) as pdf:
        if fmt == "mcdonalds":
            dishes = _parse_mcdonalds(pdf, source_file)
        elif fmt == "vira":
            dishes = _parse_vira(pdf, source_file)
        else:
            dishes = _parse_h3(pdf, source_file)

    logger.info("Extracted %d dishes from %s", len(dishes), source_file)
    return dishes
