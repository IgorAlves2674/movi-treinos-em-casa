import type { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius, spacing } from '@/theme';

import { CheckIcon } from './icons';
import { T } from './ui';

/** Cartão de opção única (rádio): título, dica e marca quando escolhido. */
export function OptionCard({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="title">{label}</T>
        {hint ? (
          <T variant="body" color={colors.textSecondary} style={{ fontSize: 13 }}>
            {hint}
          </T>
        ) : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>{selected && <View style={styles.radioDot} />}</View>
    </Pressable>
  );
}

/** Linha com caixa de marcar (várias escolhas). */
export function CheckRow({
  label,
  hint,
  checked,
  onPress,
  children,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onPress: () => void;
  /** Conteúdo extra quando marcado (ex.: campo de peso máximo). */
  children?: ReactNode;
}) {
  return (
    <View style={[styles.option, styles.checkWrap, checked && styles.optionSelected]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        onPress={onPress}
        style={({ pressed }) => [styles.checkRow, { opacity: pressed ? 0.85 : 1 }]}
      >
        <View style={[styles.box, checked && styles.boxChecked]}>{checked && <CheckIcon />}</View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="title">{label}</T>
          {hint ? (
            <T variant="body" color={colors.textSecondary} style={{ fontSize: 13 }}>
              {hint}
            </T>
          ) : null}
        </View>
      </Pressable>
      {checked && children ? <View style={styles.checkExtra}>{children}</View> : null}
    </View>
  );
}

/** Botão pequeno de escolha (ex.: dias por semana). */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, { opacity: pressed ? 0.85 : 1 }]}
    >
      <T variant="label" color={selected ? colors.textOnDark : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

/** Campo de texto com rótulo, unidade e mensagem de erro. */
export function Field({
  label,
  unit,
  error,
  hint,
  ...input
}: TextInputProps & { label: string; unit?: string; error?: string | null; hint?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="label">{label}</T>
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          placeholderTextColor={colors.textSecondary}
          {...input}
          style={styles.input}
          accessibilityLabel={label}
        />
        {unit ? (
          <T variant="body" color={colors.textSecondary}>
            {unit}
          </T>
        ) : null}
      </View>
      {error ? (
        <T variant="caption" color={colors.danger}>
          {error}
        </T>
      ) : hint ? (
        <T variant="caption" color={colors.textSecondary}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

/** Barra de progresso fina (0 a 1). */
export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  checkWrap: { flexDirection: 'column', alignItems: 'stretch', gap: 0, paddingVertical: 0 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 14 },
  checkExtra: { paddingBottom: 14 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  boxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  chip: {
    minWidth: 48,
    height: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 17, color: colors.text },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
});
