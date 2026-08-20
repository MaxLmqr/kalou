import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';

import { elevation, useTheme } from '@/design';

type Variant =
  /** Carte posée sur le fond, légère ombre en clair, bordure en sombre. */
  | 'raised'
  /** Bloc creusé dans la page : vignette de réutilisation, champ, piste. */
  | 'sunken'
  /** Aplat teinté d'accent : mise en avant calme, sans ombre. */
  | 'accent'
  /** Simple regroupement, sans fond. */
  | 'plain';

export type SurfaceProps = ViewProps & {
  variant?: Variant;
  padding?: keyof ReturnType<typeof useTheme>['spacing'];
  radius?: keyof ReturnType<typeof useTheme>['radius'];
};

export function Surface({
  variant = 'raised',
  padding = 'lg',
  radius: radiusKey = 'lg',
  style,
  ...rest
}: SurfaceProps) {
  const theme = useTheme();

  const background =
    variant === 'raised'
      ? theme.colors.surface
      : variant === 'sunken'
        ? theme.colors.surfaceSunken
        : variant === 'accent'
          ? theme.colors.accentSurface
          : 'transparent';

  return (
    <View
      style={[
        {
          backgroundColor: background,
          padding: theme.spacing[padding],
          borderRadius: theme.radius[radiusKey],
        },
        variant === 'raised' ? elevation(theme.scheme, 1) : null,
        style,
      ]}
      {...rest}
    />
  );
}

export type PressableSurfaceProps = Omit<PressableProps, 'style'> &
  Pick<SurfaceProps, 'variant' | 'padding' | 'radius'> & {
    style?: ViewProps['style'];
    /** Contour d'accent : carte de choix sélectionnée dans l'onboarding. */
    selected?: boolean;
  };

/** Même surface, mais tactile : vignette de réutilisation, carte de rythme. */
export function PressableSurface({
  variant = 'sunken',
  padding = 'lg',
  radius: radiusKey = 'lg',
  selected = false,
  style,
  ...rest
}: PressableSurfaceProps) {
  const theme = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: pressed
            ? theme.colors.surfacePressed
            : variant === 'raised'
              ? theme.colors.surface
              : variant === 'accent'
                ? theme.colors.accentSurface
                : variant === 'plain'
                  ? 'transparent'
                  : theme.colors.surfaceSunken,
          padding: theme.spacing[padding],
          borderRadius: theme.radius[radiusKey],
          borderWidth: theme.borderWidth.thick,
          borderColor: selected ? theme.colors.accent : 'transparent',
        },
        variant === 'raised' && !pressed ? elevation(theme.scheme, 1) : null,
        style,
      ]}
      {...rest}
    />
  );
}
