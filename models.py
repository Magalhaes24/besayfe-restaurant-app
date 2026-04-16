"""
Data models for the allergen normalizer system.
"""

from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum


class AllergenType(str, Enum):
    CONTAINS = "contains"
    MAY_CONTAIN = "may_contain"


# -------------------------------------------------------------------------
# EU 14 major allergens — stored in canonical English keys.
# Each entry maps a set of Portuguese/variant surface forms to the key.
# -------------------------------------------------------------------------
EU_ALLERGENS = {
    "gluten": {
        "aliases_pt": [
            "glúten", "gluten",
            "trigo", "centeio", "cevada", "aveia",
            "trigo, cevada", "aveia, trigo", "cevada, trigo",
            "trigo, aveia, cevada", "centeio, cevada, trigo",
            "aveia, centeio, trigo", "cevada, aveia, centeio trigo",
            "aveia, centeio, trigo",
        ],
        "name_pt": "Glúten",
        "name_en": "Gluten",
    },
    "crustaceans": {
        "aliases_pt": ["crustáceos", "crustaceos", "crustá-ceos"],
        "name_pt": "Crustáceos",
        "name_en": "Crustaceans",
    },
    "eggs": {
        "aliases_pt": ["ovos", "ovo", "ovos"],
        "name_pt": "Ovos",
        "name_en": "Eggs",
    },
    "fish": {
        "aliases_pt": ["peixe", "peixes"],
        "name_pt": "Peixe",
        "name_en": "Fish",
    },
    "peanuts": {
        "aliases_pt": ["amendoim", "amendoins", "amen-doins"],
        "name_pt": "Amendoim",
        "name_en": "Peanuts",
    },
    "soybeans": {
        "aliases_pt": ["soja"],
        "name_pt": "Soja",
        "name_en": "Soybeans",
    },
    "milk": {
        "aliases_pt": ["leite"],
        "name_pt": "Leite",
        "name_en": "Milk",
    },
    "nuts": {
        "aliases_pt": [
            "frutos de casca rija", "frutos de c. rija", "frutos casca rija",
            "amêndoa", "avelã", "castanha do brasil", "castanha de cajú",
            "noz do queensland", "noz de macadâmia", "noz", "noz pecan",
            "pinhão", "pistacio", "pistácio", "caju",
            "sementes de abóbora",
        ],
        "name_pt": "Frutos de Casca Rija",
        "name_en": "Nuts",
    },
    "celery": {
        "aliases_pt": ["aipo"],
        "name_pt": "Aipo",
        "name_en": "Celery",
    },
    "mustard": {
        "aliases_pt": ["mostarda"],
        "name_pt": "Mostarda",
        "name_en": "Mustard",
    },
    "sesame": {
        "aliases_pt": ["sésamo", "sesamo", "s. de sésamo", "sementes de sésamo"],
        "name_pt": "Sésamo",
        "name_en": "Sesame",
    },
    "sulphites": {
        "aliases_pt": [
            "dióxido de enxofre e sulfitos >10mg/kg",
            "dióxido de enxofre e sulfitos",
            "sulfitos", "sulfitos >10mg/kg",
            "dióxido de enxofre",
        ],
        "name_pt": "Sulfitos",
        "name_en": "Sulphites",
    },
    "lupin": {
        "aliases_pt": ["tremoço", "tremoco"],
        "name_pt": "Tremoço",
        "name_en": "Lupin",
    },
    "molluscs": {
        "aliases_pt": ["moluscos"],
        "name_pt": "Moluscos",
        "name_en": "Molluscs",
    },
}


@dataclass
class AllergenPresence:
    """An allergen and how it is present in a dish."""
    allergen_key: str        # canonical key from EU_ALLERGENS
    allergen_name_pt: str
    allergen_name_en: str
    presence_type: AllergenType
    detail: Optional[str] = None   # e.g. specific nuts "Amêndoa, Avelã"


@dataclass
class Dish:
    """A single dish / menu item with its allergen profile."""
    name: str
    category: Optional[str] = None
    source_file: Optional[str] = None
    ingredients: List[str] = field(default_factory=list)
    allergens: List[AllergenPresence] = field(default_factory=list)

    # ------------------------------------------------------------------ #
    # Convenience helpers                                                  #
    # ------------------------------------------------------------------ #
    @property
    def contains_allergens(self) -> List[AllergenPresence]:
        return [a for a in self.allergens if a.presence_type == AllergenType.CONTAINS]

    @property
    def may_contain_allergens(self) -> List[AllergenPresence]:
        return [a for a in self.allergens if a.presence_type == AllergenType.MAY_CONTAIN]

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "category": self.category,
            "ingredients": self.ingredients,
            "contains_allergens": [
                {
                    "key": a.allergen_key,
                    "name_pt": a.allergen_name_pt,
                    "name_en": a.allergen_name_en,
                    "detail": a.detail,
                }
                for a in self.contains_allergens
            ],
            "may_contain_allergens": [
                {
                    "key": a.allergen_key,
                    "name_pt": a.allergen_name_pt,
                    "name_en": a.allergen_name_en,
                    "detail": a.detail,
                }
                for a in self.may_contain_allergens
            ],
        }


@dataclass
class Restaurant:
    """A restaurant with its full menu of dishes."""
    name: str
    source_file: Optional[str] = None
    dishes: List[Dish] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "source_file": self.source_file,
            "total_dishes": len(self.dishes),
            "dishes": [d.to_dict() for d in self.dishes],
        }
