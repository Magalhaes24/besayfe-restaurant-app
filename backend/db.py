"""
SQLite database setup and insert functions for the allergen normalizer.

Schema (fully normalized, 3NF):
  restaurants     (id, name, source_file)
  dishes          (id, restaurant_id, name, category)
  allergens       (id, key, name_pt, name_en)
  ingredients     (id, name)
  dish_allergens  (dish_id, allergen_id, type, detail)
  dish_ingredients(dish_id, ingredient_id)
"""

import sqlite3
import logging
from pathlib import Path
from typing import List

from models import Restaurant, AllergenType, EU_ALLERGENS

logger = logging.getLogger(__name__)

DDL = """
PRAGMA foreign_keys = ON;

-- Drop existing tables to ensure fresh schema
DROP TABLE IF EXISTS dish_ingredients;
DROP TABLE IF EXISTS dish_allergens;
DROP TABLE IF EXISTS dishes;
DROP TABLE IF EXISTS restaurants;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS allergens;

CREATE TABLE IF NOT EXISTS restaurants (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    source_file TEXT
);

CREATE TABLE IF NOT EXISTS dishes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL,
    category      TEXT,
    UNIQUE (restaurant_id, name)
);

CREATE TABLE IF NOT EXISTS allergens (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    key      TEXT    NOT NULL UNIQUE,
    name_pt  TEXT    NOT NULL,
    name_en  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS dish_allergens (
    dish_id     INTEGER NOT NULL REFERENCES dishes(id)    ON DELETE CASCADE,
    allergen_id INTEGER NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL CHECK (type IN ('contains', 'may_contain')),
    detail      TEXT,
    PRIMARY KEY (dish_id, allergen_id, type)
);

CREATE TABLE IF NOT EXISTS dish_ingredients (
    dish_id       INTEGER NOT NULL REFERENCES dishes(id)      ON DELETE CASCADE,
    ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    PRIMARY KEY (dish_id, ingredient_id)
);
"""


def get_connection(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def initialise(db_path: Path) -> sqlite3.Connection:
    """Create the database and all tables. Returns an open connection."""
    conn = get_connection(db_path)
    conn.executescript(DDL)
    conn.commit()
    logger.info("Database initialised at %s", db_path)
    return conn


def _seed_allergens(conn: sqlite3.Connection) -> None:
    """Insert the 14 EU allergen reference rows if not already present."""
    for key, meta in EU_ALLERGENS.items():
        conn.execute(
            "INSERT OR IGNORE INTO allergens (key, name_pt, name_en) VALUES (?, ?, ?)",
            (key, meta["name_pt"], meta["name_en"]),
        )
    conn.commit()


def _get_allergen_id(conn: sqlite3.Connection, key: str) -> int:
    row = conn.execute("SELECT id FROM allergens WHERE key = ?", (key,)).fetchone()
    if row is None:
        raise ValueError(f"Unknown allergen key: {key!r}")
    return row["id"]


def _upsert_ingredient(conn: sqlite3.Connection, name: str) -> int:
    conn.execute("INSERT OR IGNORE INTO ingredients (name) VALUES (?)", (name,))
    return conn.execute(
        "SELECT id FROM ingredients WHERE name = ?", (name,)
    ).fetchone()["id"]


def insert_restaurant(conn: sqlite3.Connection, restaurant: Restaurant) -> None:
    """Insert a restaurant and all its dishes, allergens, and ingredients."""
    _seed_allergens(conn)

    # --- restaurant row -------------------------------------------------- #
    conn.execute(
        "INSERT OR IGNORE INTO restaurants (name, source_file) VALUES (?, ?)",
        (restaurant.name, restaurant.source_file),
    )
    restaurant_id = conn.execute(
        "SELECT id FROM restaurants WHERE name = ?", (restaurant.name,)
    ).fetchone()["id"]

    # --- dishes ---------------------------------------------------------- #
    for dish in restaurant.dishes:
        conn.execute(
            """
            INSERT OR IGNORE INTO dishes (restaurant_id, name, category)
            VALUES (?, ?, ?)
            """,
            (restaurant_id, dish.name, dish.category),
        )

        dish_id = conn.execute(
            "SELECT id FROM dishes WHERE restaurant_id = ? AND name = ?",
            (restaurant_id, dish.name),
        ).fetchone()["id"]

        # allergen links
        for presence in dish.allergens:
            allergen_id = _get_allergen_id(conn, presence.allergen_key)
            conn.execute(
                """
                INSERT OR REPLACE INTO dish_allergens
                    (dish_id, allergen_id, type, detail)
                VALUES (?, ?, ?, ?)
                """,
                (dish_id, allergen_id, presence.presence_type.value, presence.detail),
            )

        # ingredient links
        for ingredient_name in dish.ingredients:
            ing_id = _upsert_ingredient(conn, ingredient_name)
            conn.execute(
                "INSERT OR IGNORE INTO dish_ingredients (dish_id, ingredient_id) VALUES (?, ?)",
                (dish_id, ing_id),
            )

    conn.commit()
    logger.info(
        "Inserted restaurant %r with %d dishes into the database.",
        restaurant.name, len(restaurant.dishes),
    )
