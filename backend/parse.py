"""
Usage:  python parse.py allergen_table.pdf [Restaurant Name]
Output: output/<name>.json  and  output/<name>.db
"""

import re
import sys
import json
from pathlib import Path
from typing import Optional

import pdfplumber

sys.path.insert(0, str(Path(__file__).parent))
from models import Restaurant, Dish, AllergenPresence, AllergenType, EU_ALLERGENS
from db import initialise, insert_restaurant

# ── allergen alias lookup ─────────────────────────────────────────────────────

_ALIAS: dict[str, str] = {}
for _k, _m in EU_ALLERGENS.items():
    _ALIAS[_m["name_pt"].lower()] = _k
    _ALIAS[_m["name_en"].lower()] = _k
    for _a in _m["aliases_pt"]:
        _ALIAS[_a.lower()] = _k


def _resolve(text: str) -> Optional[str]:
    t = re.sub(r"\s+", " ", text).strip().lower()
    if t in _ALIAS:
        return _ALIAS[t]
    for a, k in _ALIAS.items():
        if a and a in t:
            return k
    return None


def _presence(key: str, ptype: AllergenType, detail: str = None) -> AllergenPresence:
    m = EU_ALLERGENS[key]
    return AllergenPresence(key, m["name_pt"], m["name_en"], ptype, detail)


def _cell(v) -> str:
    return (v or "").strip()


def _merge(existing: list, incoming: list) -> list:
    idx = {(a.allergen_key, a.presence_type): a for a in existing}
    for a in incoming:
        kc = (a.allergen_key, AllergenType.CONTAINS)
        kpc = (a.allergen_key, AllergenType.MAY_CONTAIN)
        if a.presence_type == AllergenType.CONTAINS:
            idx.pop(kpc, None)
            idx[kc] = a
        elif kc not in idx:
            idx[kpc] = a
    return list(idx.values())


# ── table-based parser (Vira, McDonald's) ────────────────────────────────────

def _parse_table(page, current_category: Optional[str] = None):
    tables = page.extract_tables()
    if not tables:
        return [], current_category

    table = tables[0]
    col_map: dict[int, str] = {}
    header_idx = 0

    for i, row in enumerate(table):
        hits = {j: _resolve(_cell(v)) for j, v in enumerate(row) if _resolve(_cell(v))}
        if len(hits) >= 3:
            col_map = hits
            header_idx = i
            break

    if not col_map:
        return [], current_category

    dishes = []
    for row in table[header_idx + 1:]:
        if not row:
            continue
        name = _cell(row[0])
        if not name:
            continue

        row_text = " ".join(_cell(v) for v in row).lower()

        # No-allergen dish (McDonald's style)
        if "não tem alergénios" in row_text:
            dishes.append(Dish(name=name, category=current_category, allergens=[]))
            continue

        # Section header: all-caps with no allergen markers
        markers = [_cell(row[ci]).upper() for ci in col_map if ci < len(row)]
        if name == name.upper() and len(name) > 2 and not any(
            v in ("C", "X", "PC") or "●" in v for v in markers
        ):
            current_category = name.title()
            continue

        allergens = []
        for ci, key in col_map.items():
            if ci >= len(row):
                continue
            v = _cell(row[ci])
            vu = v.upper()
            if vu in ("C", "X") or "●" in v or "•" in v:
                detail = re.sub(r"[●•CX\s]", "", v).strip() or None if key in ("gluten", "nuts") else None
                allergens.append(_presence(key, AllergenType.CONTAINS, detail))
            elif vu == "PC":
                allergens.append(_presence(key, AllergenType.MAY_CONTAIN))

        dishes.append(Dish(name=name, category=current_category, allergens=allergens))

    return dishes, current_category


# ── word-based parser (H3 — icon column headers) ─────────────────────────────

_H3_SUB = (
    "molho", "pão ", "ovo ", "bacon", "alface", "tomate", "cebol",
    "espinafr", "parmes", "rúcul", "hambúrgu", "hamburguer", "ketchup",
    "mostarda amarela", "crocante", "vinagret", "arroz", "gelado",
    "topping", "bolacha", "suspiro", "croquetes", "maionese",
    "batata", "creme", "esparregad", "salada",
)

_H3_FIXED_X: dict[float, str] = {
    170.0: "gluten", 198.0: "crustaceans", 227.0: "eggs",    255.0: "fish",
    283.0: "peanuts", 312.0: "soybeans",   340.0: "milk",    368.0: "nuts",
    397.0: "celery",  425.0: "mustard",    453.0: "sesame",  482.0: "sulphites",
    510.0: "lupin",   538.0: "molluscs",
}


def _x_map(page) -> dict[float, str]:
    words = page.extract_words()
    if not words:
        return _H3_FIXED_X
    footer = [w for w in words if w["top"] > page.height * 0.82]
    detected = {}
    for w in footer:
        key = _resolve(w["text"])
        if key:
            detected[(w["x0"] + w["x1"]) / 2] = key
    return detected if len(detected) >= 8 else _H3_FIXED_X


def _nearest(x: float, xmap: dict[float, str], tol: float = 15.0) -> Optional[str]:
    if not xmap:
        return None
    best_k, best_d = None, float("inf")
    for cx, k in xmap.items():
        d = abs(x - cx)
        if d < best_d:
            best_d, best_k = d, k
    return best_k if best_d <= tol else None


def _parse_words(page, current_category: Optional[str] = None):
    xmap = _x_map(page)
    words = page.extract_words()
    if not words:
        return [], current_category

    NAME_X = 145.0
    SKIP = {"tabela de alerg", "página", "as informações", "legenda", "fornecedores"}

    content = [w for w in words if w["top"] < page.height * 0.82]
    rows: dict[int, list] = {}
    for w in content:
        rows.setdefault(round(w["top"] / 4) * 4, []).append(w)

    dishes = []
    current_dish: Optional[Dish] = None

    for y in sorted(rows):
        rw = sorted(rows[y], key=lambda w: w["x0"])
        name_words = [w for w in rw if w["x0"] < NAME_X]
        markers = [w for w in rw if w["x0"] >= NAME_X and w["text"].upper() in ("C", "PC")]

        if not name_words and not markers:
            continue

        name = " ".join(w["text"] for w in name_words).strip()

        if any(s in name.lower() for s in SKIP) or name.startswith("*"):
            continue

        row_allergens = []
        for mw in markers:
            cx = (mw["x0"] + mw["x1"]) / 2
            key = _nearest(cx, xmap)
            if key:
                ptype = AllergenType.CONTAINS if mw["text"].upper() == "C" else AllergenType.MAY_CONTAIN
                row_allergens.append(_presence(key, ptype))

        # Anonymous marker row → merge into current dish
        if not name and row_allergens and current_dish:
            current_dish.allergens = _merge(current_dish.allergens, row_allergens)
            continue

        if not name:
            continue

        # Section header
        if name == name.upper() and len(name) > 2 and not row_allergens:
            if current_dish:
                dishes.append(current_dish)
                current_dish = None
            current_category = name.title()
            continue

        nl = name.lower()
        is_sub = nl.startswith(_H3_SUB) or (name and name[0].islower())

        if is_sub and current_dish:
            current_dish.ingredients.append(name)
            current_dish.allergens = _merge(current_dish.allergens, row_allergens)
        else:
            if current_dish:
                dishes.append(current_dish)
            current_dish = Dish(name=name, category=current_category, allergens=row_allergens)

    if current_dish:
        dishes.append(current_dish)

    return dishes, current_category


# ── format detection + main parser ───────────────────────────────────────────

def parse_pdf(path: Path) -> list[Dish]:
    with pdfplumber.open(path) as pdf:
        text = " ".join(p.extract_text() or "" for p in pdf.pages).lower()

        # H3 uses icon column headers → must use word-based parser
        # Vira and McDonald's have text headers → table-based parser works
        is_h3 = "não tem alergénios" not in text and "virada" not in text and "vitoque" not in text

        dishes, cat = [], None
        for page in pdf.pages:
            if is_h3:
                page_dishes, cat = _parse_words(page, cat)
            else:
                page_dishes, cat = _parse_table(page, cat)
            dishes.extend(page_dishes)

    return dishes


# ── entry point ───────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: python parse.py <file.pdf> [Restaurant Name]")

    path = Path(sys.argv[1])
    if not path.is_absolute():
        path = Path.cwd() / path
    if not path.exists():
        sys.exit(f"File not found: {path}")

    name = " ".join(sys.argv[2:]) or re.sub(r"[-_]+", " ", path.stem).title()

    print(f"Parsing {path.name}...")
    dishes = parse_pdf(path)
    restaurant = Restaurant(name=name, source_file=path.name, dishes=dishes)

    out = Path("output")
    out.mkdir(exist_ok=True)
    slug = re.sub(r"\s+", "_", name).lower()

    json_path = out / f"{slug}.json"
    json_path.write_text(
        json.dumps(restaurant.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    db_path = out / f"{slug}.db"
    conn = initialise(db_path)
    insert_restaurant(conn, restaurant)
    conn.close()

    print(f"  {len(dishes)} dishes for '{name}'")
    print(f"  JSON   → {json_path}")
    print(f"  SQLite → {db_path}")


if __name__ == "__main__":
    main()
