/**
 * besayfe — Master Allergen List
 *
 * EU Regulation 1169/2011 defines 14 mandatory allergens.
 * These are the only allergens we track; they never change.
 */

export interface MasterAllergen {
  key: string; // matches AllergenEntry.key in restaurant data
  name_en: string;
  name_pt: string;
}

export const MASTER_ALLERGENS: MasterAllergen[] = [
  { key: 'celery', name_en: 'Celery', name_pt: 'Aipo' },
  {
    key: 'crustaceans',
    name_en: 'Crustaceans',
    name_pt: 'Crustáceos',
  },
  { key: 'eggs', name_en: 'Eggs', name_pt: 'Ovos' },
  { key: 'fish', name_en: 'Fish', name_pt: 'Peixe' },
  { key: 'gluten', name_en: 'Gluten', name_pt: 'Glúten' },
  { key: 'lupin', name_en: 'Lupin', name_pt: 'Tremoço' },
  { key: 'milk', name_en: 'Milk', name_pt: 'Leite' },
  { key: 'molluscs', name_en: 'Molluscs', name_pt: 'Moluscos' },
  { key: 'mustard', name_en: 'Mustard', name_pt: 'Mostarda' },
  {
    key: 'nuts',
    name_en: 'Tree Nuts',
    name_pt: 'Frutos de Casca Rija',
  },
  { key: 'peanuts', name_en: 'Peanuts', name_pt: 'Amendoins' },
  { key: 'sesame', name_en: 'Sesame', name_pt: 'Sésamo' },
  { key: 'soybeans', name_en: 'Soybeans', name_pt: 'Soja' },
  {
    key: 'sulphites',
    name_en: 'Sulphites',
    name_pt: 'Dióxido de Enxofre e Sulfitos',
  },
];

export type AllergenSeverity = 'severe' | 'mild';

export interface UserAllergen {
  key: string; // matches MasterAllergen.key and AllergenEntry.key
  severity: AllergenSeverity;
  notes: string; // empty string, not null
  addedAt: string; // ISO 8601
}

export interface UserProfile {
  schemaVersion: 1;
  allergens: UserAllergen[];
  updatedAt: string; // ISO 8601
}

export const EMPTY_PROFILE: UserProfile = {
  schemaVersion: 1,
  allergens: [],
  updatedAt: new Date().toISOString(),
};
