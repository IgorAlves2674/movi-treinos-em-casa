import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { T } from '@/components/ui';
import { colors, spacing } from '@/theme';

export type ChartPoint = { label: string; value: number };

/**
 * Gráfico de linha simples (peso, exercícios). Mostra o menor e o maior valor à
 * esquerda e a primeira e a última data embaixo. Precisa de pelo menos 2 pontos.
 */
export function LineChart({
  points,
  format = (n) => String(n),
  height = 140,
}: {
  points: ChartPoint[];
  format?: (n: number) => string;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Folga para a linha não encostar nas bordas; linha reta fica no meio.
  const span = max - min || Math.max(1, Math.abs(max) * 0.1);
  const lo = min - (max === min ? span / 2 : span * 0.12);
  const hi = max + (max === min ? span / 2 : span * 0.12);
  const pad = 8;
  const x = (i: number) => pad + (points.length === 1 ? (width - 2 * pad) / 2 : (i * (width - 2 * pad)) / (points.length - 1));
  const y = (v: number) => pad + (1 - (v - lo) / (hi - lo)) * (height - 2 * pad);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={styles.row}>
        <View style={[styles.axis, { height }]}>
          <T variant="caption" color={colors.textSecondary}>
            {format(max)}
          </T>
          <T variant="caption" color={colors.textSecondary}>
            {format(min)}
          </T>
        </View>
        <View style={{ flex: 1, height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <Svg width={width} height={height}>
              <Line x1={0} x2={width} y1={y(max)} y2={y(max)} stroke={colors.border} strokeWidth={1} />
              <Line x1={0} x2={width} y1={y(min)} y2={y(min)} stroke={colors.border} strokeWidth={1} />
              <Path d={d} stroke={colors.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {points.length <= 30 &&
                points.map((p, i) => (
                  <Circle key={i} cx={x(i)} cy={y(p.value)} r={3.5} fill={colors.surface} stroke={colors.primary} strokeWidth={2} />
                ))}
            </Svg>
          )}
        </View>
      </View>
      <View style={[styles.row, styles.dates]}>
        <T variant="caption" color={colors.textSecondary}>
          {points[0]?.label}
        </T>
        <T variant="caption" color={colors.textSecondary}>
          {points[points.length - 1]?.label}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  axis: { justifyContent: 'space-between', paddingVertical: 2, minWidth: 34 },
  dates: { justifyContent: 'space-between', paddingLeft: 34 + spacing.sm },
});
