import React, { createContext, useContext } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import type { UserAllergen, UserProfile } from '../data/allergens';

export interface ProfileContextValue {
  profile: UserProfile;
  loading: boolean;
  addAllergen: (a: UserAllergen) => Promise<void>;
  removeAllergen: (key: string) => Promise<void>;
  updateAllergen: (
    key: string,
    patch: Partial<Omit<UserAllergen, 'key'>>
  ) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const value = useUserProfile();
  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx)
    throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
