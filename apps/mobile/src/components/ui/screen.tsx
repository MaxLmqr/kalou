import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  /**
   * Écran de formulaire : remonte le contenu et l'action ancrée au-dessus du
   * clavier, et renvoie le clavier au défilement.
   *
   * iOS ne redimensionne pas la fenêtre quand le clavier apparaît : il la
   * recouvre. Un écran à champs de saisie et à bouton ancré devient alors une
   * impasse — on peut taper, mais plus valider. Les claviers numériques
   * aggravent le cas : sans touche de retour, rien ne les referme.
   *
   * La zone sûre du bas est réservée en même temps : une action ancrée qui
   * finit sous l'indicateur d'accueil n'est pas plus cliquable qu'une action
   * cachée par le clavier.
   */
  avoidKeyboard?: boolean;
};

/** Conteneur d'écran : fond, zone sûre, gouttière et largeur maximale. */
export function Screen({
  children,
  scroll = true,
  bleed,
  footer,
  underTabBar,
  floatingAction,
  avoidKeyboard,
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

  const corps = (
    <>
      {scroll ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={avoidKeyboard ? 'on-drag' : 'none'}
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
            paddingBottom: theme.spacing.lg + (avoidKeyboard ? insets.bottom : 0),
            width: '100%',
            maxWidth: theme.maxContentWidth,
            alignSelf: 'center',
          }}>
          {footer}
        </View>
      ) : null}
    </>
  );

  return (
    /*
      La zone sûre du haut est prise sur la **fenêtre**, pas sur la vue.

      `SafeAreaView` lit la zone sûre de la vue où il est monté, et celle d'une
      modale présentée en plein écran par-dessus un autre écran vaut zéro : le
      titre du composeur passait sous l'heure de la barre d'état. Le défaut ne se
      voyait pas en ouvrant l'écran directement — seulement quand la modale
      s'ouvre par-dessus l'accueil, c'est-à-dire dans le seul chemin réel.
    */
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
      {...rest}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {corps}
        </KeyboardAvoidingView>
      ) : (
        corps
      )}

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
  /**
   * Bout de ligne d'en-tête, aligné à droite du titre : un décompte, un lien.
   * Une seule ligne, en typographie de légende — pas un emplacement d'action.
   */
  trailing?: ReactNode;
  children: ReactNode;
};

/** Regroupement titré, avec l'espacement vertical standard. */
export function Section({ title, trailing, children, style, ...rest }: SectionProps) {
  const theme = useTheme();

  return (
    <View style={[{ gap: theme.spacing.md }, style]} {...rest}>
      {title || trailing ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          {title ? (
            <Text variant="overline" color="textMuted" style={{ flex: 1 }}>
              {title}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {trailing}
        </View>
      ) : null}
      {children}
    </View>
  );
}
