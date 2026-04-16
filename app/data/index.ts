import vira from './vira.json';
import mcdonalds from './mcdonalds.json';
import h3 from './h3.json';

export interface AllergenEntry {
  key: string;
  name_pt: string;
  name_en: string;
  detail: string | null;
}

export interface Dish {
  name: string;
  category: string | null;
  ingredients: string[];
  contains_allergens: AllergenEntry[];
  may_contain_allergens: AllergenEntry[];
}

export interface Restaurant {
  name: string;
  source_file: string;
  total_dishes: number;
  dishes: Dish[];
}

export const restaurants: Restaurant[] = [vira, mcdonalds, h3] as unknown as Restaurant[];
