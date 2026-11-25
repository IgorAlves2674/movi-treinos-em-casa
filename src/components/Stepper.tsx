import { Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/theme';

/** Campo numérico com − e + (séries, carga, testes). */
export function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  step,
  emptyLabel,
}: {
  label: string;
  value: number | null;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  emptyLabel?: string;
}) {
  const v = value ?? 0;
  return (
    <View style={styles.stepper}>
      <T variant="label" style={{ flex: 1 }}>
        {label}
      </T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} −`}
        onPress={() => onChange(Math.max(min, v - step))}
        style={styles.stepBtn}
      >
        <T variant="h2" color={colors.primary}>
          −
        </T>
      </Pressable>
      <T style={styles.stepValue}>{value === null && emptyLabel ? emptyLabel : String(v)}</T>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} +`}
        onPress={() => onChange(Math.min(max, v + step))}
        style={styles.stepBtn}
      >
        <T variant="h2" color={colors.primary}>
          +
        </T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { fontFamily: fonts.bold, fontSize: 24, minWidth: 64, textAlign: 'center', color: colors.text },
});
