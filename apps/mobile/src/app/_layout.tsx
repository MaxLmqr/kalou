import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { ThemeProvider, themes } from '@/design';
import { queryClient } from '@/lib/query-client';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  // La navigation react-navigation a son propre thème : on le dérive des mêmes
  // jetons pour qu'aucune couleur ne diverge entre les écrans et les barres.
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    const colors = themes[scheme];
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.accent,
      },
    };
  }, [scheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <NavigationThemeProvider value={navigationTheme}>
          <StatusBar style="auto" />
          <AppTabs />
        </NavigationThemeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
