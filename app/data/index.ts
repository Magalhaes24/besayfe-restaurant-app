import vira from '../../backend/output/vira.json';
import mcdonalds from '../../backend/output/mcdonalds.json';
import h3 from '../../backend/output/h3.json';

export interface AllergenEntry {
  key: string;
  name_pt: string;
  name_en: string;
  detail: string | null;
}

export interface Dish {
  name: string;
  category: string | null;
  source_file?: string;
  ingredients: string[];
  contains_allergens: AllergenEntry[];
  may_contain_allergens: AllergenEntry[];
  data_verified?: boolean; // true = allergen data confirmed accurate; false/undefined = data may be incomplete
}

export interface Restaurant {
  name: string;
  source_file: string;
  total_dishes: number;
  dishes: Dish[];
}

export const restaurants: Restaurant[] = [vira, mcdonalds, h3] as Restaurant[];
