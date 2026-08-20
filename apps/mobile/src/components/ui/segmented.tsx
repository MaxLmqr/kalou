import { Pressable, View } from 'react-native';

import { elevation, useTheme } from '@/design';

import { Text } from './text';

export type SegmentedProps<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** Bascule entre deux ou trois vues d'un même contenu : « 30 j » / « 90 j ». */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surfaceSunken,
        borderRadius: theme.radius.pill,
        padding: 2,
      }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              {
                paddingVertical: 5,
                paddingHorizontal: theme.spacing.lg,
                borderRadius: theme.radius.pill,
                backgroundColor: selected ? theme.colors.surface : 'transparent',
              },
              selected ? elevation(theme.scheme, 1) : null,
            ]}>
            <Text variant="caption" color={selected ? 'text' : 'textSecondary'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
