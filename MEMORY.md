# Normalizer — Project Memory

## What this project does

Reads allergen/ingredient sheets (PDF, XLSX, CSV) from restaurant menus and normalizes the data into:
- A **JSON file** per restaurant
- A shared **SQLite database** (`allergens.db`)

The output structure is: **Restaurant → Dishes → Ingredients + Allergens (contains / may contain)**

---

## File structure

```
normalizer/
├── MEMORY.md                   # This file
├── backend/                    # Python backend (normalizer CLI)
│   ├── normalizer.py           # Main entry point + CLI
│   ├── models.py               # Dataclasses: Restaurant, Dish, AllergenPresence
│   ├── db.py                   # SQLite schema + insert logic
│   ├── requirements.txt        # Python dependencies
│   ├── parsers/
│   │   ├── pdf_parser.py       # PDF extraction (3 hardcoded restaurant formats)
│   │   ├── xlsx_parser.py      # Excel extraction (auto-detects header row)
│   │   ├── csv_parser.py       # CSV extraction (wide and long formats)
│   │   └── interactive_parser.py  # Interactive wizard for non-standard sheets
│   ├── tables-test/            # Test input files
│   │   ├── 5-vp-alergenios-balcao-07-abr_2026.pdf
│   │   ├── tabela_alergenios_h3.pdf
│   │   └── vira_alergenios.pdf
│   └── output/                 # Generated output (gitignore this)
│       ├── allergens.db        # Unified SQLite DB (current schema with restaurants table)
│       ├── vira.json           # Vira restaurant — current restaurant-grouped format
│       ├── mcdonalds.json      # McDonald's — current format
│       ├── h3.json             # H3 — current format
│       ├── dishes.json         # LEGACY — flat dish list, pre-restaurant model, ignore
│       ├── vira.db             # LEGACY — per-restaurant DB from initial agent run
│       ├── mcdonalds.db        # LEGACY — per-restaurant DB from initial agent run
│       └── h3.db               # LEGACY — per-restaurant DB from initial agent run
└── app/                        # Expo cross-platform app (iOS, Android, web)
    ├── app/                    # Expo Router screens
    │   ├── _layout.tsx         # Root Stack navigator
    │   ├── index.tsx           # Restaurant list screen
    │   └── [restaurantId]/
    │       ├── _layout.tsx     # Inner Stack navigator
    │       ├── index.tsx       # Dishes list screen
    │       └── [dishId].tsx    # Dish detail screen
    └── data/                   # Static JSON data files
        ├── index.ts            # Typed re-exports of all restaurant data
        ├── vira.json
        ├── mcdonalds.json
        └── h3.json
```

> **Running the backend:** always `cd backend/` first, then `python normalizer.py ...`
> The parsers use `from parsers.pdf_parser import ...` which resolves relative to `backend/`.

> **Note:** `dishes.json`, `vira.db`, `mcdonalds.db`, `h3.db` are leftovers from the
> initial prototype before the restaurant model was introduced. Safe to delete.
> `allergens.db` is the canonical database going forward.

---

## Iteration history

### v1 — Initial build
- Parsers for 3 PDFs (McDonald's, H3, Vira), XLSX, and CSV
- Output: flat `dishes.json` + per-restaurant `.db` files
- Data model: `Dish` only — `source_file` was a plain string

### v2 — Interactive wizard
- Added `parsers/interactive_parser.py` — 9-step CLI wizard for non-standard sheets
- Added `-i` / `--interactive` flag to `normalizer.py`
- Fixed latent bug: `_make_allergen_presence` alias was missing from `pdf_parser.py`;
  xlsx and csv parsers were importing a name that didn't exist

### v3 — Restaurant model (current)
- Added `Restaurant` dataclass to `models.py`
- Rebuilt `db.py`: added `restaurants` table; `dishes` now has `restaurant_id FK`
- `normalizer.py`: wraps parsed dishes in a `Restaurant`, added `--restaurant-name` flag
- JSON output is now per-restaurant (`vira.json`, etc.) instead of a flat `dishes.json`
- Default JSON filename derived from restaurant name (lowercase + underscores)

---

## Data model

### `Restaurant`
| Field | Type | Notes |
|---|---|---|
| `name` | str | Provided via `--restaurant-name` or derived from filename |
| `source_file` | str | Original filename |
| `dishes` | List[Dish] | All dishes belonging to this restaurant |

### `Dish`
| Field | Type | Notes |
|---|---|---|
| `name` | str | Product/dish name |
| `category` | str \| None | Section header (e.g. "Burgers", "Salads") — optional |
| `ingredients` | List[str] | Optional — not all source files include them |
| `allergens` | List[AllergenPresence] | Both contains and may_contain entries |

> All three fields — `ingredients`, `contains_allergens`, `may_contain_allergens` — are
> non-mandatory. A dish can have none of them.

### `AllergenPresence`
| Field | Type | Notes |
|---|---|---|
| `allergen_key` | str | Canonical EU-14 key (e.g. `"gluten"`, `"milk"`) |
| `allergen_name_pt` | str | Portuguese name |
| `allergen_name_en` | str | English name |
| `presence_type` | AllergenType | `"contains"` or `"may_contain"` |
| `detail` | str \| None | Extra detail for gluten (grain type) or nuts (specific nut) |

### EU 14 allergens recognized
`gluten`, `crustaceans`, `eggs`, `fish`, `peanuts`, `soybeans`, `milk`, `nuts`, `celery`, `mustard`, `sesame`, `sulphites`, `lupin`, `molluscs`

---

## Database schema

```sql
restaurants      (id, name, source_file)
dishes           (id, restaurant_id FK, name, category)
allergens        (id, key, name_pt, name_en)        -- seeded with EU 14 on every run
ingredients      (id, name)
dish_allergens   (dish_id FK, allergen_id FK, type, detail)
dish_ingredients (dish_id FK, ingredient_id FK)
```

Key constraints:
- `dishes.restaurant_id` → every dish belongs to exactly one restaurant
- `dishes UNIQUE (restaurant_id, name)` → no duplicate dish names per restaurant
- `dish_allergens.type CHECK ('contains' | 'may_contain')`
- All FKs have `ON DELETE CASCADE`
- `INSERT OR IGNORE` everywhere → running the same file twice is safe

> If you have an `allergens.db` from v1 (no `restaurants` table), delete it — the schema
> is incompatible and the system will not auto-migrate.

---

## CLI usage

```bash
# Always run from inside backend/
cd backend/

# Install dependencies
pip install -r requirements.txt

# Auto-parse a known format
python normalizer.py tables-test/vira_alergenios.pdf --restaurant-name "Vira"

# Without --restaurant-name the name is derived from the filename:
#   vira_alergenios.pdf          → "Vira"
#   tabela_alergenios_h3.pdf     → "H3"
#   5-vp-alergenios-balcao-...   → "Vp Balcao"
python normalizer.py tables-test/tabela_alergenios_h3.pdf

# Custom output location and DB name
python normalizer.py file.xlsx --restaurant-name "Cantina" --output-dir exports/ --db-name menu.db

# Interactive wizard for non-standard / unknown sheets
python normalizer.py weird_sheet.xlsx --interactive --restaurant-name "My Place"
python normalizer.py data.csv -i

# Skip one of the exports
python normalizer.py file.pdf --no-db
python normalizer.py file.pdf --no-json

# Debug logging
python normalizer.py file.pdf -v
```

---

## JSON output shape

```json
{
  "name": "Vira",
  "source_file": "vira_alergenios.pdf",
  "total_dishes": 79,
  "dishes": [
    {
      "name": "MOLHO DA CASA",
      "category": "Receitas De Frango",
      "ingredients": [],
      "contains_allergens": [
        { "key": "sulphites", "name_pt": "Sulfitos", "name_en": "Sulphites", "detail": null }
      ],
      "may_contain_allergens": []
    }
  ]
}
```

---

## PDF parsers — format-specific logic

Each restaurant uses a different table layout; the PDF parser detects the format by filename and applies the matching strategy.

| Restaurant | Detection | Strategy | Contains marker | May contain marker |
|---|---|---|---|---|
| **McDonald's** | `balcao` in filename | Multi-column table; `●` (U+25CF) bullet | `●` | none |
| **H3** | `h3` in filename | Word x-position mapping — table extraction returns 36-56 random columns | `C` | `PC` |
| **Vira** | `vira` in filename | Clean 13-column table; `PRODUTO` header in row 0 | `X` | `PC` |

### Extraction results from test files
| File | Restaurant name | Dishes |
|---|---|---|
| `5-vp-alergenios-balcao-07-abr_2026.pdf` | McDonald's | 124 |
| `tabela_alergenios_h3.pdf` | H3 | 42 |
| `vira_alergenios.pdf` | Vira | 79 |

---

## Interactive wizard (`--interactive` / `-i`)

For files with non-standard column names or custom markers. Steps:

1. Load file and show a preview table (first 12 rows, up to 18 columns)
2. Ask which row index contains the headers
3. Ask which column index is the dish/product name
4. For each remaining column: show the EU-14 allergen menu and ask to map or skip
5. Show all unique cell values found; ask which mean "contains" and which mean "may contain"
6. Optionally assign a category/section column
7. Confirm (or override) the data start row
8. Process and build `Dish` objects
9. Print a 5-dish sample for the user to verify before saving

Supports `.pdf`, `.xlsx`, `.xls`, `.csv`.

---

## Known issues / edge cases

| Issue | Detail |
|---|---|
| **Encoding** | CSV parser tries UTF-8-sig → UTF-8 → latin-1; handles BOM |
| **Delimiter** | CSV sniffer tries `,` `;` `\t` `\|` |
| **Duplicate dishes** | `INSERT OR IGNORE` + `UNIQUE (restaurant_id, name)` makes re-runs safe |
| **Old DB incompatibility** | Delete any `allergens.db` created before v3 (missing `restaurants` table) |
| **`_make_allergen_presence` alias** | `pdf_parser.py` exports this as an alias for `_make_presence` so xlsx, csv, and interactive parsers can import it |
| **Legacy output files** | `dishes.json`, `vira.db`, `mcdonalds.db`, `h3.db` in `output/` are from v1 — safe to delete |

---

## Dependencies

| Package | Purpose |
|---|---|
| `pdfplumber >= 0.11.0` | PDF table + word extraction |
| `pandas >= 2.0.0` | XLSX/CSV loading |
| `openpyxl >= 3.1.0` | `.xlsx` engine for pandas |
| `xlrd >= 2.0.0` | `.xls` engine for pandas |
| `sqlite3` | Built-in — SQLite database |
