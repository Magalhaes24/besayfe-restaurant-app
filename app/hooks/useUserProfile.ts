import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { EMPTY_PROFILE, UserAllergen, UserProfile } from '../data/allergens';

const STORAGE_KEY = '@besayfe/profile_v1';

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed: UserProfile = JSON.parse(raw);
            // Future: if parsed.schemaVersion !== 1, run migration here
            setProfile(parsed);
          } catch (e) {
            console.warn('Failed to parse profile from storage:', e);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const persist = useCallback(async (next: UserProfile) => {
    setProfile(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addAllergen = useCallback(
    async (allergen: UserAllergen) => {
      const next: UserProfile = {
        ...profile,
        allergens: [
          ...profile.allergens.filter((a) => a.key !== allergen.key),
          allergen,
        ],
        updatedAt: new Date().toISOString(),
      };
      await persist(next);
    },
    [profile, persist]
  );

  const removeAllergen = useCallback(
    async (key: string) => {
      const next: UserProfile = {
        ...profile,
        allergens: profile.allergens.filter((a) => a.key !== key),
        updatedAt: new Date().toISOString(),
      };
      await persist(next);
    },
    [profile, persist]
  );

  const updateAllergen = useCallback(
    async (key: string, patch: Partial<Omit<UserAllergen, 'key'>>) => {
      const next: UserProfile = {
        ...profile,
        allergens: profile.allergens.map((a) =>
          a.key === key ? { ...a, ...patch } : a
        ),
        updatedAt: new Date().toISOString(),
      };
      await persist(next);
    },
    [profile, persist]
  );

  return { profile, loading, addAllergen, removeAllergen, updateAllergen };
}
