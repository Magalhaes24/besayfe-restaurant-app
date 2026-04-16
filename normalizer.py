"""
Allergen Normalizer — main entry point.

Usage:
    python normalizer.py <file_path> [options]

Supports:
    .pdf  — pdfplumber-based extraction (McDonald's, H3, Vira formats)
    .xlsx — pandas-based extraction
    .csv  — stdlib csv-based extraction

Outputs (written to --output-dir, default: ./output/):
    dishes.json   — normalized allergen data grouped by restaurant
    allergens.db  — SQLite database

Options:
    --restaurant-name    Name of the restaurant (defaults to a cleaned filename).
    --interactive / -i   Launch the interactive wizard to manually map columns.
                         Use this for non-standard sheets whose headers are not
                         recognised automatically.

Example:
    python normalizer.py tables-test/vira_alergenios.pdf --restaurant-name "Vira"
    python normalizer.py my_custom_sheet.xlsx --interactive --restaurant-name "Cantina"
    python normalizer.py data.csv -i --output-dir exports/ --db-name menu.db
"""

import argparse
import json
import logging
import re
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("normalizer")


def _name_from_path(file_path: Path) -> str:
    """Derive a human-readable restaurant name from a filename."""
    stem = file_path.stem
    # drop leading digits / dates like "5-vp-" or "07-abr-2026"
    stem = re.sub(r"^\d+[-_]", "", stem)
    stem = re.sub(r"[-_]\d{2}[-_]\w{3}[-_]\d{4}$", "", stem)  # trailing date
    stem = re.sub(r"[-_](alergenios|allergens?|tabela)[-_]?", " ", stem, flags=re.I)
    stem = re.sub(r"[-_]+", " ", stem).strip().title()
    return stem or file_path.stem


def parse_file(file_path: Path, interactive: bool = False):
    """Dispatch to the correct parser based on file extension."""
    if interactive:
        from parsers.interactive_parser import parse_interactive
        return parse_interactive(file_path)

    ext = file_path.suffix.lower()

    if ext == ".pdf":
        from parsers.pdf_parser import parse_pdf
        return parse_pdf(file_path)

    elif ext in (".xlsx", ".xls"):
        from parsers.xlsx_parser import parse_xlsx
        return parse_xlsx(file_path)

    elif ext == ".csv":
        from parsers.csv_parser import parse_csv
        return parse_csv(file_path)

    else:
        raise ValueError(
            f"Unsupported file type: {ext!r}. "
            "Supported types: .pdf, .xlsx, .xls, .csv"
        )


def export_json(restaurant, output_path: Path) -> None:
    """Write a restaurant (with its dishes) to a JSON file."""
    output_path.write_text(
        json.dumps(restaurant.to_dict(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    logger.info(
        "JSON written: %s  (%d dishes)", output_path, len(restaurant.dishes)
    )


def export_db(restaurant, db_path: Path) -> None:
    """Insert a restaurant and its dishes into a SQLite database."""
    from db import initialise, insert_restaurant
    conn = initialise(db_path)
    insert_restaurant(conn, restaurant)
    conn.close()
    logger.info("SQLite DB written: %s", db_path)


def print_summary(restaurant) -> None:
    """Print a human-readable summary to stdout."""
    dishes = restaurant.dishes
    print(f"\n{'='*60}")
    print(f"  {restaurant.name}  —  {len(dishes)} dishes")
    print(f"{'='*60}")

    from collections import Counter
    from models import AllergenType
    contains_counter: Counter = Counter()
    may_counter: Counter = Counter()

    for dish in dishes:
        for a in dish.allergens:
            if a.presence_type == AllergenType.CONTAINS:
                contains_counter[a.allergen_name_en] += 1
            else:
                may_counter[a.allergen_name_en] += 1

    print("\nTop 'Contains' allergens:")
    for allergen, count in contains_counter.most_common(10):
        print(f"  {allergen:<25} {count:>4} dishes")

    print("\nTop 'May contain' allergens:")
    for allergen, count in may_counter.most_common(10):
        print(f"  {allergen:<25} {count:>4} dishes")

    print(f"\nFirst 5 dishes:")
    for dish in dishes[:5]:
        c_names = ", ".join(a.allergen_name_en for a in dish.contains_allergens) or "none"
        pc_names = ", ".join(a.allergen_name_en for a in dish.may_contain_allergens) or "none"
        print(f"  [{dish.category or 'uncategorised'}] {dish.name}")
        print(f"    Contains:    {c_names}")
        print(f"    May contain: {pc_names}")
        if dish.ingredients:
            print(f"    Ingredients: {', '.join(dish.ingredients[:5])}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Normalize allergen/ingredient data from PDF, XLSX, or CSV files."
    )
    parser.add_argument(
        "file",
        type=Path,
        help="Input file path (.pdf, .xlsx, or .csv)",
    )
    parser.add_argument(
        "--restaurant-name",
        type=str,
        default=None,
        help="Name of the restaurant (default: derived from filename)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("output"),
        help="Directory for output files (default: ./output/)",
    )
    parser.add_argument(
        "--db-name",
        type=str,
        default="allergens.db",
        help="SQLite database filename (default: allergens.db)",
    )
    parser.add_argument(
        "--json-name",
        type=str,
        default=None,
        help=(
            "JSON output filename "
            "(default: <restaurant_name>.json, spaces replaced with underscores)"
        ),
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        help="Skip SQLite export",
    )
    parser.add_argument(
        "--no-json",
        action="store_true",
        help="Skip JSON export",
    )
    parser.add_argument(
        "-i", "--interactive",
        action="store_true",
        help=(
            "Launch the interactive wizard to manually map columns. "
            "Use this for non-standard sheets that are not auto-recognised."
        ),
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Validate input
    file_path = args.file.resolve()
    if not file_path.exists():
        logger.error("File not found: %s", file_path)
        sys.exit(1)

    # Ensure output directory exists
    output_dir: Path = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    # Parse
    if not args.interactive:
        logger.info("Processing: %s", file_path)
    try:
        dishes = parse_file(file_path, interactive=args.interactive)
    except Exception as exc:
        logger.error("Failed to parse %s: %s", file_path, exc, exc_info=True)
        sys.exit(1)

    if not dishes:
        logger.warning("No dishes extracted from %s", file_path)
        sys.exit(0)

    # Wrap dishes in a Restaurant
    from models import Restaurant
    restaurant_name = args.restaurant_name or _name_from_path(file_path)
    restaurant = Restaurant(
        name=restaurant_name,
        source_file=file_path.name,
        dishes=dishes,
    )

    # Derive default JSON filename from restaurant name
    json_name = args.json_name or (
        re.sub(r"\s+", "_", restaurant_name).lower() + ".json"
    )

    # Export JSON
    if not args.no_json:
        json_path = output_dir / json_name
        try:
            export_json(restaurant, json_path)
        except Exception as exc:
            logger.error("JSON export failed: %s", exc, exc_info=True)

    # Export SQLite
    if not args.no_db:
        db_path = output_dir / args.db_name
        try:
            export_db(restaurant, db_path)
        except Exception as exc:
            logger.error("DB export failed: %s", exc, exc_info=True)

    # Print summary
    print_summary(restaurant)


if __name__ == "__main__":
    main()
