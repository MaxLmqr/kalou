import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import type { ReactNode } from 'react';

import { elevation, useTheme } from '@/design';

import { Icon } from './icon';
import { Text } from './text';

type Variant =
  /** Action principale de l'écran. Une seule par écran. */
  | 'primary'
  /** Action secondaire, sur fond neutre. */
  | 'secondary'
  /** Action tertiaire, sans fond : « Passer », « Annuler ». */
  | 'ghost';

type Size = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Occupe toute la largeur disponible. Défaut pour `lg`. */
  block?: boolean;
  /** Emplacement libre à gauche du libellé (icône fournie par l'appelant). */
  icon?: ReactNode;
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  loading = false,
  block,
  icon,
  disabled,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const fullWidth = block ?? size === 'lg';

  const background = (pressed: boolean) => {
    if (variant === 'primary') return pressed ? theme.colors.accentPressed : theme.colors.accent;
    if (variant === 'secondary')
      return pressed ? theme.colors.surfacePressed : theme.colors.surfaceSunken;
    return pressed ? theme.colors.surfacePressed : 'transparent';
  };

  const labelColor =
    variant === 'primary' ? 'textOnAccent' : variant === 'secondary' ? 'text' : 'textSecondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          height: size === 'lg' ? theme.hitSize.lg : theme.hitSize.md,
          paddingHorizontal: theme.spacing.xl,
          borderRadius: theme.radius.pill,
          backgroundColor: background(pressed),
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: theme.spacing.sm,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.4 : 1,
        },
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.colors.textOnAccent : theme.colors.text}
        />
      ) : (
        <>
          {icon}
          <Text variant="label" color={labelColor}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export type FabProps = Omit<PressableProps, 'style' | 'children'> & {
  accessibilityLabel: string;
  /** Contenu du bouton : une icône, ou le « + » par défaut. */
  children?: ReactNode;
};

/** Bouton d'action flottant : ouvre le menu d'action rapide (docs/03 § 1). */
export function Fab({ accessibilityLabel, children, ...rest }: FabProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        {
          width: theme.hitSize.fab,
          height: theme.hitSize.fab,
          borderRadius: theme.radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? theme.colors.accentPressed : theme.colors.accent,
        },
        elevation(theme.scheme, 2),
      ]}
      {...rest}>
      {/*
        Le « + » est tracé, pas composé : le plus d'une fonte de texte est fin
        et court, il ne fait pas un bouton d'action.
      */}
      {children ?? <Icon name="plus" size={26} color="textOnAccent" strokeWidth={2} />}
    </Pressable>
  );
}
