import { useState } from 'react';
import { View } from 'react-native';
import { Line, Path, Rect, Svg } from 'react-native-svg';

import { useTheme } from '@/design';

export type BalanceChartProps = {
  /** Balance de chaque jour, en kcal. Négative = déficit. */
  balances: number[];
  /** Moyenne glissante 7 jours, même longueur. */
  average: number[];
  height?: number;
};

/**
 * Balance quotidienne en barres, moyenne glissante superposée.
 *
 * Le déficit descend sous la ligne de zéro et l'excédent monte au-dessus, dans
 * **un seul et même aplat** : c'est la position qui porte le signe. Colorer
 * différemment les deux serait un vert / rouge déguisé, alors que c'est la vue
 * censée déculpabiliser un écart isolé (docs/03 § 4).
 */
export function BalanceChart({ balances, average, height = 112 }: BalanceChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const extent = Math.max(...balances.map(Math.abs), ...average.map(Math.abs), 1);
  /** La ligne de zéro n'est pas au milieu : le déficit occupe plus de place que l'excédent. */
  const zero = height * 0.36;
  const scale = (value: number) => (value / extent) * (value < 0 ? height - zero : zero);

  const slot = balances.length > 0 ? width / balances.length : 0;
  const barWidth = Math.max(slot - 7, 2);

  const averagePath = average
    .map((value, index) => `${index === 0 ? 'M' : 'L'}${index * slot + slot / 2} ${zero - scale(value)}`)
    .join(' ');

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={0} y1={zero} x2={width} y2={zero} stroke={theme.colors.borderStrong} strokeWidth={1} />

          {balances.map((value, index) => {
            const length = Math.abs(scale(value));
            return (
              <Rect
                key={index}
                x={index * slot}
                y={value < 0 ? zero : zero - length}
                width={barWidth}
                height={length}
                rx={3}
                fill={theme.colors.accent}
                fillOpacity={0.24}
              />
            );
          })}

          <Path
            d={averagePath}
            stroke={theme.colors.accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      ) : null}
    </View>
  );
}
