import { Stack, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Field } from '@/components/form';
import { PrimaryButton, T } from '@/components/ui';
import { fmt, strings } from '@/i18n';
import { parseDecimal } from '@/lib/dates';
import { BODY_LIMITS, saveBodyLog, type BodyInput } from '@/progress/stats';
import { colors, spacing } from '@/theme';

const s = strings.bodyForm;
type Key = keyof BodyInput;
const MEASURES: [Key, string][] = [
  ['waist_cm', s.waist],
  ['hip_cm', s.hip],
  ['arm_cm', s.arm],
];

/** Registrar peso e medidas opcionais do dia (spec 8.2). Se já houver registro hoje, atualiza. */
export default function BodyLogScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [text, setText] = useState<Record<Key, string>>({ weight_kg: '', waist_cm: '', hip_cm: '', arm_cm: '' });
  const [showErrors, setShowErrors] = useState(false);
  const savingRef = useRef(false);

  const values = Object.fromEntries(
    (Object.keys(text) as Key[]).map((k) => [k, parseDecimal(text[k])]),
  ) as BodyInput;
  const errorOf = (k: Key): string | null => {
    const raw = text[k].trim();
    if (!raw) return null;
    const v = values[k];
    const [min, max] = BODY_LIMITS[k];
    return v === null || v < min || v > max ? fmt(s.errRange, { min, max }) : null;
  };
  const keys = Object.keys(text) as Key[];
  const hasError = keys.some((k) => errorOf(k) !== null);
  const isEmpty = keys.every((k) => values[k] === null);

  async function save() {
    setShowErrors(true);
    if (hasError || isEmpty || savingRef.current) return;
    savingRef.current = true;
    try {
      // Peso com 1 casa e medidas com 1 casa, como no banco.
      const rounded = Object.fromEntries(
        keys.map((k) => [k, values[k] === null ? null : Math.round((values[k] as number) * 10) / 10]),
      ) as BodyInput;
      await saveBodyLog(db, rounded);
      router.back();
    } finally {
      savingRef.current = false;
    }
  }

  const field = (k: Key, label: string, unit: string) => (
    <Field
      key={k}
      label={label}
      unit={unit}
      value={text[k]}
      onChangeText={(v) => setText((t) => ({ ...t, [k]: v }))}
      keyboardType="decimal-pad"
      error={showErrors ? errorOf(k) : null}
      placeholder="0"
    />
  );

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <Stack.Screen options={{ title: s.title }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {field('weight_kg', s.weight, 'kg')}
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: 2 }}>
              <T variant="title">{s.measuresTitle}</T>
              <T variant="caption" color={colors.textSecondary}>
                {s.hint}
              </T>
            </View>
            {MEASURES.map(([k, label]) => field(k, label, 'cm'))}
          </View>
          {showErrors && isEmpty && (
            <T variant="caption" color={colors.danger}>
              {s.errEmpty}
            </T>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <PrimaryButton label={s.save} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
});
