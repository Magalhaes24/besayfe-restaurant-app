/**
 * besayfe ThemeContext
 *
 * Provides the active theme tokens to every component in the tree.
 * Defaults to light mode; reads the device color scheme.
 *
 * Usage:
 *   const theme = useTheme();
 *   <View style={{ backgroundColor: theme.surface }} />
 */

import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { light, dark, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(light);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const theme = (scheme === 'dark' ? dark : light) as Theme;

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
