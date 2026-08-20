import { createContext, use, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { themes, type ColorSchemeName, type ThemeColors } from './theme';
import {
  borderWidth,
  hitSize,
  maxContentWidth,
  motion,
  radius,
  spacing,
  typography,
} from './tokens';

export type Theme = {
  scheme: ColorSchemeName;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  borderWidth: typeof borderWidth;
  hitSize: typeof hitSize;
  typography: typeof typography;
  motion: typeof motion;
  maxContentWidth: number;
};

function buildTheme(scheme: ColorSchemeName): Theme {
  return {
    scheme,
    colors: themes[scheme],
    spacing,
    radius,
    borderWidth,
    hitSize,
    typography,
    motion,
    maxContentWidth,
  };
}

const ThemeContext = createContext<Theme>(buildTheme('light'));

export function ThemeProvider({
  children,
  forceScheme,
}: {
  children: ReactNode;
  /** Force un thème, indépendamment du système. Utile pour les aperçus. */
  forceScheme?: ColorSchemeName;
}) {
  const systemScheme = useColorScheme();
  const scheme = forceScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => buildTheme(scheme), [scheme]);

  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return use(ThemeContext);
}
