import { useState, type ReactNode } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design';

import { Text } from './text';

export type ScreenProps = ViewProps & {
  children: ReactNode;
  /** Contenu défilant. Désactiver pour un écran plein (caméra, sélecteur). */
  scroll?: boolean;
  /** Retire la gouttière horizontale, ex. pour une liste bord à bord. */
  bleed?: boolean;
  /** Zone ancrée en bas (bouton principal). */
  footer?: ReactNode;
  /**
   * L'écran est sous la barre d'onglets : le contenu réserve sa hauteur pour ne
   * pas finir derrière elle, et `floatingAction` se pose au-dessus.
   */
  underTabBar?: boolean;
  /** Bouton d'action flottant, ancré en bas à droite. */
  floatingAction?: ReactNode;
};

/** Conteneur d'écran : fond, zone sûre, gouttière et largeur maximale. */
export function Screen({
  children,
  scroll = true,
  bleed,
  footer,
  underTabBar,
  floatingAction,
  style,
  ...rest
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // Le pied de page est ancré hors du défilement : sans réserver sa hauteur
  // réelle, la fin du contenu passe dessous. On la mesure plutôt que de la
  // deviner, parce qu'elle dépend du nombre de boutons.
  const [footerHeight, setFooterHeight] = useState(0);

  /** Hauteur occupée par la barre d'onglets, zone sûre comprise. */
  const tabBarSpace = underTabBar ? theme.tabBarHeight + insets.bottom : 0;

  const contentStyle = {
    paddingHorizontal: bleed ? 0 : theme.spacing.lg,
    paddingBottom:
      theme.spacing.xxl + tabBarSpace + footerHeight + (floatingAction ? theme.hitSize.fab : 0),
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
            onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
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

      {floatingAction ? (
        <View
          style={{
            position: 'absolute',
            right: theme.spacing.lg,
            bottom: tabBarSpace + theme.spacing.lg,
          }}>
          {floatingAction}
        </View>
      ) : null}
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
