import React, { createContext, useContext, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark';

const light = {
  primary: '#8B5E3C',
  primaryLight: '#C4A882',
  primaryDark: '#5D3A1A',
  accent: '#D4A574',
  accentLight: '#F5E6D3',
  background: '#FFF9F2',
  surface: '#FFFFFF',
  text: '#2C1810',
  textSecondary: '#7A6555',
  border: '#E8DDD4',
  success: '#6B8E5A',
  danger: '#C75C5C',
  disabled: '#C4B8AD',
  shadow: 'rgba(44, 24, 16, 0.08)',
} as const;

const dark = {
  primary: '#D4A574',
  primaryLight: '#8B7355',
  primaryDark: '#E8C9A8',
  accent: '#C4A882',
  accentLight: '#3A2E24',
  background: '#1A1410',
  surface: '#2A2118',
  text: '#F0E6DC',
  textSecondary: '#A89888',
  border: '#3D3228',
  success: '#8BAF78',
  danger: '#E07070',
  disabled: '#5A4E44',
  shadow: 'rgba(0, 0, 0, 0.3)',
} as const;

export type ColorScheme = typeof light;

// Current colors — mutated by ThemeProvider
export let Colors: ColorScheme = { ...light };

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 24, full: 999,
} as const;

interface ThemeContextType {
  mode: ThemeMode;
  toggle: () => void;
  colors: ColorScheme;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  const toggle = useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      Colors = next === 'light' ? { ...light } : { ...dark };
      return next;
    });
  }, []);

  const colors = mode === 'light' ? light : dark;
  // Keep the mutable export in sync
  Object.assign(Colors, colors);

  return (
    <ThemeContext.Provider value={{ mode, toggle, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
};
