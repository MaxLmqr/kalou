import { useState } from 'react';
import { View } from 'react-native';
import { Circle, Line, Path, Svg } from 'react-native-svg';

import { useTheme } from '@/design';

export type WeightChartProps = {
  /** Pesées brutes, dans l'ordre chronologique. Une valeur `null` = pas de pesée ce jour. */
  weighIns: (number | null)[];
  /** Tendance lissée, même longueur que `weighIns` (docs/02 § 4). */
  trend: number[];
  /** Pente d'objectif : poids de départ et poids visé sur la fenêtre affichée. */
  goal?: { from: number; to: number };
  height?: number;
};

/**
 * Courbe de poids : la tendance en trait plein, les pesées en points, la
 * ligne d'objectif en pointillé.
 *
 * L'échelle est calée sur l'ensemble des valeurs affichées, avec une marge
 * d'un demi-kilo : sans elle, une tendance très plate remplirait la hauteur et
 * ferait passer 200 g pour un effondrement.
 */
export function WeightChart({ weighIns, trend, goal, height = 132 }: WeightChartProps) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const values = [
    ...trend,
    ...weighIns.filter((v): v is number => v !== null),
    ...(goal ? [goal.from, goal.to] : []),
  ];
  const min = Math.min(...values) - 0.5;
  const max = Math.max(...values) + 0.5;
  const span = max - min || 1;

  const x = (index: number) => (trend.length <= 1 ? 0 : (index / (trend.length - 1)) * width);
  const y = (value: number) => height - ((value - min) / span) * height;

  const trendPath = trend.map((value, index) => `${index === 0 ? 'M' : 'L'}${x(index)} ${y(value)}`).join(' ');

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          {[0.15, 0.5, 0.85].map((fraction) => (
            <Line
              key={fraction}
              x1={0}
              y1={height * fraction}
              x2={width}
              y2={height * fraction}
              stroke={theme.colors.surfaceSunken}
              strokeWidth={1}
            />
          ))}

          {goal ? (
            <Line
              x1={0}
              y1={y(goal.from)}
              x2={width}
              y2={y(goal.to)}
              stroke={theme.colors.borderStrong}
              strokeWidth={1.5}
              strokeDasharray="3 5"
            />
          ) : null}

          <Path
            d={trendPath}
            stroke={theme.colors.accent}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {weighIns.map((value, index) =>
            value === null ? null : (
              <Circle key={index} cx={x(index)} cy={y(value)} r={2.5} fill={theme.colors.pending} />
            ),
          )}
        </Svg>
      ) : null}
    </View>
  );
}
