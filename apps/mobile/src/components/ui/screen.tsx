import type { ReactNode } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/design';

import { Text } from './text';

export type ScreenProps = ViewProps & {
  children: ReactNode;
  /** Contenu défilant. Désactiver pour un écran plein (caméra, sélecteur). */
  scroll?: boolean;
  /** Retire la gouttière horizontale, ex. pour une liste bord à bord. */
  bleed?: boolean;
  /** Zone ancrée en bas (bouton principal, bouton d'action flottant). */
  footer?: ReactNode;
};

/** Conteneur d'écran : fond, zone sûre, gouttière et largeur maximale. */
export function Screen({ children, scroll = true, bleed, footer, style, ...rest }: ScreenProps) {
  const theme = useTheme();

  const contentStyle = {
    paddingHorizontal: bleed ? 0 : theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.xl,
    width: '100%' as const,
    maxWidth: theme.maxContentWidth,
    alignSelf: 'center' as const,
  };

  return (
    <View style={[{ flex: 1, backgroundColor: theme.colors.background }, style]} {...rest}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={contentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[contentStyle, { flex: 1 }]}>{children}</View>
        )}
        {footer ? (
          <View
            style={{
              paddingHorizontal: theme.spacing.lg,
              paddingTop: theme.spacing.md,
              paddingBottom: theme.spacing.lg,
              width: '100%',
              maxWidth: theme.maxContentWidth,
              alignSelf: 'center',
            }}>
            {footer}
          </View>
        ) : null}
      </SafeAreaView>
    </View>
  );
}

export type SectionProps = ViewProps & {
  /** En-tête en petites capitales : « Aujourd'hui », « Réutiliser ». */
  title?: string;
  children: ReactNode;
};

/** Regroupement titré, avec l'espacement vertical standard. */
export function Section({ title, children, style, ...rest }: SectionProps) {
  const theme = useTheme();

  return (
    <View style={[{ gap: theme.spacing.md }, style]} {...rest}>
      {title ? (
        <Text variant="overline" color="textMuted">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}
