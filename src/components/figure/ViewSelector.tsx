import { Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/ui';
import type { FigureView } from '@/figure/types';
import { strings } from '@/i18n';
import { colors, radius } from '@/theme';

/** Seletor de vista (Lateral · Frente · Costas). Com uma vista só, mostra o aviso. */
export function ViewSelector({
  views,
  value,
  onChange,
}: {
  views: FigureView[];
  value: FigureView;
  onChange: (v: FigureView) => void;
}) {
  if (views.length <= 1) {
    return (
      <View style={[styles.wrap, styles.only]}>
        <T variant="caption" color={colors.textSecondary}>
          {strings.figure.onlyLateral}
        </T>
      </View>
    );
  }
  return (
    <View style={styles.wrap} accessibilityRole="tablist">
      {views.map((v) => {
        const on = v === value;
        return (
          <Pressable
            key={v}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(v)}
            style={[styles.button, on && styles.buttonOn]}
          >
            <T variant="label" style={styles.label} color={on ? colors.textOnDark : colors.textSecondary}>
              {strings.figure.views[v]}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.sm,
    padding: 3,
    gap: 2,
  },
  only: { paddingVertical: 7, paddingHorizontal: 10 },
  button: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 9 },
  buttonOn: { backgroundColor: colors.primary },
  label: { fontSize: 13 },
});
