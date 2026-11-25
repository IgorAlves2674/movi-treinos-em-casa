import { Redirect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckRow, Chip, Field, OptionCard, ProgressBar } from '@/components/form';
import { ChevronLeftIcon } from '@/components/icons';
import { Card, PrimaryButton, T } from '@/components/ui';
import type { Equipamento } from '@/content/exercises/types';
import type { Goal, Level, Sex } from '@/db/tables';
import { fmt, strings } from '@/i18n';
import {
  EMPTY_ANSWERS,
  inRange,
  isStepValid,
  isUnderage,
  LIMITS,
  parseNumber,
  saveOnboarding,
  STEPS,
  type OnboardingAnswers,
} from '@/profile/onboarding';
import { useProfile } from '@/profile/useProfile';
import { colors, spacing } from '@/theme';

const s = strings.onboarding;
type SetAnswers = (patch: Partial<OnboardingAnswers>) => void;

/**
 * Onboarding (spec seção 4): uma pergunta por tela, com barra de progresso.
 * Nada é gravado até a última tela (ciência + consentimento dos dados de saúde).
 */
export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const { profile } = useProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(EMPTY_ANSWERS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  const current = STEPS[step];
  const valid = isStepValid(current, answers);
  const isLast = step === STEPS.length - 1;
  const set: SetAnswers = (patch) => setAnswers((prev) => ({ ...prev, ...patch }));

  const goTo = (n: number) => {
    setStep(n);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

  // Botão "voltar" do Android volta uma tela do onboarding.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setStep(step - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  // Perfil salvo (agora ou antes): segue para o app.
  if (profile) return <Redirect href="/" />;

  async function next() {
    if (!valid || saving) return;
    if (!isLast) return goTo(step + 1);
    setSaving(true);
    setSaveError(false);
    try {
      await saveOnboarding(db, answers);
    } catch {
      setSaveError(true);
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={s.back}
            onPress={() => goTo(step - 1)}
            disabled={step === 0}
            hitSlop={12}
            style={{ opacity: step === 0 ? 0 : 1 }}
          >
            <ChevronLeftIcon />
          </Pressable>
          <View style={{ flex: 1 }}>
            <ProgressBar value={(step + 1) / STEPS.length} />
          </View>
          <T variant="caption" color={colors.textSecondary}>
            {fmt(s.progress, { step: step + 1, total: STEPS.length })}
          </T>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {current === 'name' && <NameStep a={answers} set={set} onSubmit={next} />}
          {current === 'data' && <DataStep a={answers} set={set} />}
          {current === 'goal' && <GoalStep a={answers} set={set} />}
          {current === 'level' && <LevelStep a={answers} set={set} />}
          {current === 'routine' && <RoutineStep a={answers} set={set} />}
          {current === 'restrictions' && <RestrictionsStep a={answers} set={set} />}
          {current === 'equipment' && <EquipmentStep a={answers} set={set} />}
          {current === 'consent' && <ConsentStep a={answers} set={set} />}
        </ScrollView>

        <View style={styles.footer}>
          {isLast && !valid && (
            <T variant="caption" color={colors.textSecondary} style={styles.center}>
              {s.consent.required}
            </T>
          )}
          {saveError && (
            <T variant="caption" color={colors.danger} style={styles.center}>
              {s.saveError}
            </T>
          )}
          <PrimaryButton
            label={saving ? s.saving : isLast ? s.finish : s.next}
            onPress={next}
            disabled={!valid || saving}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Title({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={{ gap: 6 }}>
      <T variant="h1">{title}</T>
      {subtitle ? (
        <T variant="body" color={colors.textSecondary} style={{ fontSize: 15 }}>
          {subtitle}
        </T>
      ) : null}
    </View>
  );
}

type StepProps = { a: OnboardingAnswers; set: SetAnswers };

function NameStep({ a, set, onSubmit }: StepProps & { onSubmit: () => void }) {
  return (
    <>
      <Title title={s.name.title} subtitle={s.name.subtitle} />
      <Field
        label={s.name.label}
        value={a.name}
        onChangeText={(name) => set({ name })}
        placeholder={s.name.placeholder}
        autoCapitalize="words"
        autoComplete="name"
        maxLength={40}
        returnKeyType="next"
        onSubmitEditing={onSubmit}
        autoFocus
      />
    </>
  );
}

/** Mensagem de erro de um campo numérico (só depois que algo foi digitado). */
function rangeError(text: string, range: readonly [number, number]): string | null {
  if (!text.trim()) return null;
  return inRange(parseNumber(text), range) ? null : fmt(s.data.outOfRange, { min: range[0], max: range[1] });
}

function DataStep({ a, set }: StepProps) {
  const d = s.data;
  const ageError = isUnderage(a)
    ? d.underage
    : a.age.trim() && !Number.isInteger(parseNumber(a.age))
      ? fmt(d.outOfRange, { min: LIMITS.age[0], max: LIMITS.age[1] })
      : rangeError(a.age, LIMITS.age);
  return (
    <>
      <Title title={d.title} subtitle={d.subtitle} />
      <Field
        label={d.age}
        unit={d.ageUnit}
        value={a.age}
        onChangeText={(age) => set({ age })}
        keyboardType="number-pad"
        maxLength={3}
        error={ageError}
      />
      <Field
        label={d.weight}
        unit={d.weightUnit}
        value={a.weight}
        onChangeText={(weight) => set({ weight })}
        keyboardType="decimal-pad"
        maxLength={5}
        error={rangeError(a.weight, LIMITS.weight)}
      />
      <Field
        label={d.height}
        unit={d.heightUnit}
        value={a.height}
        onChangeText={(height) => set({ height })}
        keyboardType="number-pad"
        maxLength={3}
        error={rangeError(a.height, LIMITS.height)}
      />
      <View style={{ gap: 6 }}>
        <T variant="label">
          {d.sex}{' '}
          <T variant="caption" color={colors.textSecondary}>
            ({s.optional})
          </T>
        </T>
        <View style={styles.chips}>
          {(Object.keys(d.sexOptions) as Sex[]).map((sex) => (
            <Chip
              key={sex}
              label={d.sexOptions[sex]}
              selected={a.sex === sex}
              onPress={() => set({ sex: a.sex === sex ? null : sex })}
            />
          ))}
        </View>
      </View>
    </>
  );
}

function GoalStep({ a, set }: StepProps) {
  const g = s.goal;
  return (
    <>
      <Title title={g.title} subtitle={g.subtitle} />
      {(Object.keys(g.options) as Goal[]).map((goal) => (
        <OptionCard
          key={goal}
          label={g.options[goal].label}
          hint={g.options[goal].hint}
          selected={a.goal === goal}
          onPress={() => set({ goal })}
        />
      ))}
    </>
  );
}

function LevelStep({ a, set }: StepProps) {
  const l = s.level;
  return (
    <>
      <Title title={l.title} subtitle={l.subtitle} />
      {(Object.keys(l.options) as Level[]).map((level) => (
        <OptionCard
          key={level}
          label={l.options[level].label}
          hint={l.options[level].hint}
          selected={a.level === level}
          onPress={() => set({ level })}
        />
      ))}
    </>
  );
}

const MINUTES = [15, 30, 45, 60] as const;

function RoutineStep({ a, set }: StepProps) {
  const r = s.routine;
  return (
    <>
      <Title title={r.title} subtitle={r.subtitle} />
      <View style={{ gap: spacing.sm }}>
        <T variant="label">{r.days}</T>
        <View style={styles.chips}>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <Chip key={n} label={String(n)} selected={a.daysPerWeek === n} onPress={() => set({ daysPerWeek: n })} />
          ))}
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <T variant="label">{r.minutes}</T>
        <View style={styles.chips}>
          {MINUTES.map((n) => (
            <Chip
              key={n}
              label={fmt(r.minutesValue, { n })}
              selected={a.minutesPerSession === n}
              onPress={() => set({ minutesPerSession: n })}
            />
          ))}
        </View>
      </View>
    </>
  );
}

function RestrictionsStep({ a, set }: StepProps) {
  const r = s.restrictions;
  return (
    <>
      <Title title={r.title} subtitle={r.subtitle} />
      <CheckRow
        label={r.jumpsNoise.label}
        hint={r.jumpsNoise.hint}
        checked={a.avoidJumpsNoise}
        onPress={() => set({ avoidJumpsNoise: !a.avoidJumpsNoise })}
      />
      <CheckRow
        label={r.impact.label}
        hint={r.impact.hint}
        checked={a.avoidImpact}
        onPress={() => set({ avoidImpact: !a.avoidImpact })}
      />
    </>
  );
}

/** Equipamentos por categoria (spec seção 4). Os sempre disponíveis não aparecem. */
const EQUIPMENT_GROUPS: { key: keyof typeof s.equipment.categories; items: Equipamento[] }[] = [
  { key: 'pesos', items: ['halteres', 'barra_anilhas', 'kettlebell', 'caneleira'] },
  { key: 'barras', items: ['barra_fixa', 'step'] },
  { key: 'elasticos', items: ['elastico_alca', 'miniband'] },
  { key: 'cardio', items: ['corda', 'esteira', 'bicicleta', 'eliptico'] },
];

function EquipmentStep({ a, set }: StepProps) {
  const e = s.equipment;
  const toggle = (item: Equipamento) =>
    set({ equipment: a.equipment.includes(item) ? a.equipment.filter((x) => x !== item) : [...a.equipment, item] });
  return (
    <>
      <Title title={e.title} subtitle={e.subtitle} />
      {EQUIPMENT_GROUPS.map((group) => (
        <View key={group.key} style={{ gap: spacing.sm }}>
          <T variant="overline" color={colors.textSecondary}>
            {e.categories[group.key].toUpperCase()}
          </T>
          {group.items.map((item) => (
            <CheckRow key={item} label={e.items[item as keyof typeof e.items]} checked={a.equipment.includes(item)} onPress={() => toggle(item)}>
              {item === 'halteres' && (
                <Field
                  label={e.dumbbellMax}
                  unit={e.kgUnit}
                  value={a.dumbbellMaxKg}
                  onChangeText={(dumbbellMaxKg) => set({ dumbbellMaxKg })}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  error={rangeError(a.dumbbellMaxKg, LIMITS.dumbbell)}
                />
              )}
              {item === 'barra_anilhas' && (
                <Field
                  label={e.barbellMax}
                  unit={e.kgUnit}
                  value={a.barbellMaxKg}
                  onChangeText={(barbellMaxKg) => set({ barbellMaxKg })}
                  keyboardType="decimal-pad"
                  maxLength={5}
                  error={rangeError(a.barbellMaxKg, LIMITS.barbell)}
                />
              )}
            </CheckRow>
          ))}
        </View>
      ))}
      {a.equipment.length === 0 && (
        <T variant="body" color={colors.textSecondary}>
          {e.none}
        </T>
      )}
    </>
  );
}

function ConsentStep({ a, set }: StepProps) {
  const c = s.consent;
  return (
    <>
      <Title title={c.title} />
      <Card style={styles.warning}>
        <T variant="body" style={{ fontSize: 15, lineHeight: 22 }}>
          {c.health}
        </T>
      </Card>
      <CheckRow label={c.healthAck} checked={a.healthAck} onPress={() => set({ healthAck: !a.healthAck })} />
      <CheckRow
        label={c.dataConsent}
        checked={a.healthDataConsent}
        onPress={() => set({ healthDataConsent: !a.healthDataConsent })}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  content: { padding: spacing.xl, paddingTop: spacing.md, gap: 18 },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  warning: { borderColor: '#F3D9B5', backgroundColor: '#FFF8EC' },
  center: { textAlign: 'center' },
});
